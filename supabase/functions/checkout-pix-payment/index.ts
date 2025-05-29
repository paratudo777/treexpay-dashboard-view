
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Criar PIX via NovaEra - usando endpoint correto
    const pixData = {
      externalId: `checkout_${checkout.id}_${Date.now()}`,
      amount: amountInCents,
      description: `Pagamento: ${checkout.title}`,
      buyer: {
        name: customerName || "Cliente",
        email: customerEmail || "cliente@email.com",
        phone: "11999999999",
        document: "12345678900"
      }
    };

    console.log('Enviando dados para NovaEra:', pixData);

    // Corrigir a URL do endpoint NovaEra
    const novaEraResponse = await fetch(`${NOVAERA_BASE_URL}/v1/pix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': NOVAERA_PK,
        'Client-Secret': NOVAERA_SK,
      },
      body: JSON.stringify(pixData)
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
        customer_name: customerName || 'Cliente',
        customer_email: customerEmail || null,
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

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        checkout,
        pix: novaEraData.data || novaEraData
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
