
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const NOVAERA_BASE_URL = Deno.env.get('NOVAERA_BASE_URL');
    const NOVAERA_PK = Deno.env.get('NOVAERA_PK');
    const NOVAERA_SK = Deno.env.get('NOVAERA_SK');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !NOVAERA_BASE_URL || !NOVAERA_PK || !NOVAERA_SK) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    const { checkoutSlug, customerName, customerEmail } = body;

    if (!checkoutSlug) {
      throw new Error('Checkout slug is required');
    }

    if (!customerName || !customerName.trim() || customerName.trim().length < 3) {
      throw new Error('Nome do cliente deve ter pelo menos 3 caracteres');
    }

    console.log('Buscando checkout com slug:', checkoutSlug);

    // Buscar checkout ativo usando o slug
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('url_slug', checkoutSlug)
      .eq('active', true)
      .single();

    if (checkoutError || !checkout) {
      console.error('Erro ao buscar checkout:', checkoutError);
      throw new Error('Checkout not found or inactive');
    }

    console.log('Checkout encontrado:', checkout);

    // Buscar informações do vendedor (dono do checkout)
    console.log('Buscando informações do vendedor com ID:', checkout.user_id);
    
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('id, name, email, phone, cpf')
      .eq('id', checkout.user_id)
      .single();

    if (sellerError || !sellerProfile) {
      console.error('Erro ao buscar perfil do vendedor:', sellerError);
      throw new Error('Seller profile not found');
    }

    console.log('Perfil do vendedor encontrado:', {
      id: sellerProfile.id,
      name: sellerProfile.name,
      email: sellerProfile.email,
      hasCpf: !!sellerProfile.cpf,
      hasPhone: !!sellerProfile.phone
    });

    // Validar dados obrigatórios do vendedor
    if (!sellerProfile.cpf) {
      throw new Error('Vendedor não possui CPF cadastrado');
    }

    if (!sellerProfile.phone) {
      throw new Error('Vendedor não possui telefone cadastrado');
    }

    // Validar CPF do vendedor
    if (!isValidCpf(sellerProfile.cpf)) {
      throw new Error('CPF do vendedor é inválido');
    }

    const amountInCents = Math.round(checkout.amount * 100);

    // Configurar taxa da plataforma (3% padrão)
    const platformFeePercent = 3; // 3%
    const platformFeeAmount = (checkout.amount * platformFeePercent) / 100;
    const netAmount = checkout.amount - platformFeeAmount;

    console.log('Valores calculados:', {
      amount: checkout.amount,
      amountInCents,
      platformFeeAmount,
      netAmount
    });

    // Preparar autenticação Basic
    const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`);
    const authHeader = `Basic ${credentials}`;

    const externalRef = `checkout_${checkout.id}_${Date.now()}`;

    // Usar EXATAMENTE a mesma estrutura de dados que funciona no depósito
    const pixPayload = {
      amount: amountInCents,
      paymentMethod: "pix",
      externalRef: externalRef,
      postbackUrl: `${SUPABASE_URL}/functions/v1/checkout-pix-webhook`,
      customer: {
        name: sellerProfile.name,
        email: sellerProfile.email,
        phone: sellerProfile.phone,
        document: {
          type: "cpf",
          number: sellerProfile.cpf
        }
      },
      pix: {
        pixKey: "treex@tecnologia.com.br",
        pixKeyType: "email",
        expiresInSeconds: 3600
      },
      items: [
        { 
          title: checkout.title, 
          quantity: 1, 
          tangible: false, 
          unitPrice: amountInCents 
        }
      ],
      metadata: "{\"origin\":\"TreexPay Checkout\"}",
      traceable: false
    };

    console.log('Enviando dados para NovaEra com CPF do vendedor:', {
      ...pixPayload,
      customer: {
        ...pixPayload.customer,
        document: { type: "cpf", number: "[MASKED]" }
      }
    });

    // Usar o mesmo endpoint que funciona no depósito: /transactions
    const novaEraResponse = await fetch(`${NOVAERA_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixPayload)
    });

    console.log('Resposta NovaEra status:', novaEraResponse.status);

    if (!novaEraResponse.ok) {
      const errorText = await novaEraResponse.text();
      console.error('Erro na resposta NovaEra:', errorText);
      throw new Error(`Failed to create PIX payment: ${errorText}`);
    }

    const novaEraData = await novaEraResponse.json();
    console.log('Dados recebidos da NovaEra:', novaEraData);

    // Salvar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from('checkout_payments')
      .insert({
        checkout_id: checkout.id,
        customer_name: customerName.trim(),
        customer_email: customerEmail?.trim() || null,
        amount: checkout.amount,
        platform_fee: platformFeeAmount,
        net_amount: netAmount,
        status: 'pending',
        pix_data: novaEraData
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Erro ao criar registro de pagamento:', paymentError);
      throw new Error('Failed to create payment record');
    }

    console.log('Pagamento criado com sucesso:', payment.id);

    // Retornar dados no formato esperado pela página de checkout
    return new Response(
      JSON.stringify({
        success: true,
        payment,
        checkout,
        pix: {
          qrcode: novaEraData.data.pix.qrcode,
          qrcodeText: novaEraData.data.pix.qrcode,
          expiresAt: novaEraData.data.pix.expirationDate,
          expirationDate: novaEraData.data.pix.expirationDate
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in checkout-pix-payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
