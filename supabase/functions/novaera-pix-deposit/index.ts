
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
      expirationDate: string;
    };
    externalId: string;
  };
}

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

    if (!amount || amount <= 0 || amount > 50000) {
      throw new Error('Valor inválido');
    }

    if (!userId || !userName) {
      throw new Error('Dados do usuário obrigatórios');
    }

    const cpfToValidate = userCpf || "11144477735";
    if (!isValidCpf(cpfToValidate)) {
      throw new Error('CPF inválido');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`);
    const authHeader = `Basic ${credentials}`;

    // Criar depósito no banco - o trigger automaticamente criará a transação
    const { data: depositData, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_id: userId,
        amount: Number(amount),
        pix_key: "treex@tecnologia.com.br",
        receiver_name: "Treex Tecnologia",
        status: 'waiting'
      })
      .select()
      .single();

    if (depositError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: depositError,
          message: 'Deposit creation failed'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    const externalRef = `deposit_${depositData.id}`;

    // Usar email genérico para evitar envio de notificações para o usuário real
    // Garantir que as notificações estejam desabilitadas
    const pixResponse = await fetch(`${NOVAERA_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "paymentMethod": "pix",
        "amount": amount * 100,
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
          "email": "noreply@treexpay.site", // Email genérico para evitar notificações
          "phone": userPhone || "5511999999999",
          "document": { 
            "type": "cpf", 
            "number": cpfToValidate
          }
        },
        "metadata": "{\"origin\":\"TreexPay Deposit\"}",
        "traceable": false,
        // IMPORTANTE: Desabilitar notificações automáticas
        "notifications": {
          "email": false,
          "sms": false
        }
      }),
    });

    if (!pixResponse.ok) {
      const errorBody = await pixResponse.text();
      throw new Error(`PIX creation failed: ${pixResponse.status} - ${errorBody}`);
    }

    const pixData: NovaEraPixResponse = await pixResponse.json();

    // Atualizar depósito com QR code
    const { error: updateError } = await supabase
      .from('deposits')
      .update({
        qr_code: pixData.data.pix.qrcode
      })
      .eq('id', depositData.id);

    if (updateError) {
      // Silent error for QR code update
    }

    return new Response(
      JSON.stringify({
        success: true,
        deposit: { ...depositData, qr_code: pixData.data.pix.qrcode },
        novaera: pixData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
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
