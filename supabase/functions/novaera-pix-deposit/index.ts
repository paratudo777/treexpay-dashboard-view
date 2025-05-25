
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

// Função para validar CPF
function isValidCpf(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf[i-1]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf[i-1]) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf[10]);
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

    // Log para verificar a service key
    console.log('Service key check:', SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10));

    // Validate CPF
    const cpfToValidate = userCpf || "11144477735"; // Use test CPF if not provided
    if (!isValidCpf(cpfToValidate)) {
      throw new Error('CPF inválido');
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Create basic auth header
    const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`);
    const authHeader = `Basic ${credentials}`;

    console.log('Creating PIX deposit for amount:', amount);

    // Generate external reference
    const externalRef = `deposit_${Date.now()}_${userId.substring(0, 8)}`;

    // Create PIX transaction with required fields
    const pixResponse = await fetch(`${NOVAERA_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "paymentMethod": "pix",
        "amount": amount * 100, // Convert to centavos
        "externalRef": externalRef,
        "postbackUrl": `${SUPABASE_URL}/functions/v1/novaera-pix-webhook`,
        "pix": {
          "pixKey": "treex@tecnologia.com.br",
          "pixKeyType": "email",
          "expiresInSeconds": 3600
        },
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
          "phone": userPhone || "5511999999999",
          "document": { 
            "type": "cpf", 
            "number": cpfToValidate
          }
        },
        "metadata": "{\"origin\":\"3Peaks App\"}",
        "traceable": false
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

    // Log do payload que será enviado para o Supabase
    const depositPayload = {
      user_id: userId,
      amount: Number(amount), // Garantir que é numérico
      qr_code: pixData.data.pix.qrcodeText,
      pix_key: "treex@tecnologia.com.br",
      receiver_name: "Treex Tecnologia",
      status: 'waiting'
    };
    
    console.log('Deposit payload:', JSON.stringify(depositPayload, null, 2));

    // Save deposit to Supabase
    const { data: depositData, error: depositError } = await supabase
      .from('deposits')
      .insert(depositPayload)
      .select()
      .single();

    if (depositError) {
      console.error('Supabase insert error:', JSON.stringify(depositError, null, 2));
      // Retornar o erro completo do Supabase para análise
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: depositError,
          message: 'Deposit creation failed',
          payload: depositPayload
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log('Deposit saved successfully:', depositData);

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
