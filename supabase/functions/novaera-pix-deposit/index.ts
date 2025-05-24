
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NovaEraPixResponse {
  success: boolean;
  message: string;
  status: number;
  data: {
    id: number;
    status: string;
    amount: number;
    pix: {
      qrcode: string;
      qrcodeText: string;
      expiresAt: string;
    };
    externalId: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, userId, userName, userEmail, userPhone, userCpf } = await req.json();

    const NOVAERA_BASE_URL = Deno.env.get('NOVAERA_BASE_URL');
    const NOVAERA_PK = Deno.env.get('NOVAERA_PK');
    const NOVAERA_SK = Deno.env.get('NOVAERA_SK');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NOVAERA_BASE_URL || !NOVAERA_PK || !NOVAERA_SK) {
      throw new Error('NovaEra API credentials not configured');
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Create basic auth header
    const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`);
    const authHeader = `Basic ${credentials}`;

    console.log('Creating PIX deposit for amount:', amount);

    // Generate external reference
    const externalRef = `deposit_${Date.now()}_${userId.substring(0, 8)}`;

    // Create PIX transaction
    const pixResponse = await fetch(`${NOVAERA_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "paymentMethod": "pix",
        "amount": amount * 100, // Convert to centavos
        "ip": "192.168.0.1",
        "pix": { "expiresInDays": 1 },
        "items": [
          { 
            "title": "Depósito TreexPay", 
            "quantity": 1, 
            "tangible": false, 
            "unitPrice": amount * 100 
          }
        ],
        "customer": {
          "name": userName,
          "email": userEmail,
          "phone": userPhone || "11999999999",
          "document": { "type": "cpf", "number": userCpf || "12345678900" }
        },
        "metadata": "{\"origin\":\"3Peaks App\"}",
        "traceable": false,
        "externalRef": externalRef,
        "postbackUrl": `${SUPABASE_URL}/functions/v1/novaera-pix-webhook`
      }),
    });

    console.log('PIX response status:', pixResponse.status);

    if (!pixResponse.ok) {
      const errorBody = await pixResponse.text();
      console.error('PIX creation error:', errorBody);
      throw new Error(`PIX creation failed: ${pixResponse.status} - ${errorBody}`);
    }

    const pixData: NovaEraPixResponse = await pixResponse.json();
    console.log('PIX created successfully:', pixData);

    // Extract PIX key from QR code text (simplified extraction)
    const extractPixKey = (qrcodeText: string) => {
      // This is a simplified extraction - in a real scenario you'd parse the PIX payload
      return "treex@tecnologia.com.br";
    };

    // Save deposit to Supabase
    const { data: depositData, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_id: userId,
        amount: amount,
        qr_code: pixData.data.pix.qrcodeText,
        pix_key: extractPixKey(pixData.data.pix.qrcodeText),
        receiver_name: "Treex Tecnologia",
        status: 'waiting'
      })
      .select()
      .single();

    if (depositError) {
      console.error('Error saving deposit:', depositError);
      throw new Error('Failed to save deposit to database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        deposit: depositData,
        novaera: pixData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('PIX deposit error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
