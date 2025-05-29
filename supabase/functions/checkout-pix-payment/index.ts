
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

    // Buscar checkout ativo
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('url_slug', checkoutSlug)
      .eq('active', true)
      .single();

    if (checkoutError || !checkout) {
      throw new Error('Checkout not found or inactive');
    }

    const amountInCents = Math.round(checkout.amount * 100);

    // Configurar taxa da plataforma (3% padrão)
    const platformFeePercent = 3; // 3%
    const platformFeeAmount = (checkout.amount * platformFeePercent) / 100;
    const netAmount = checkout.amount - platformFeeAmount;

    // Criar PIX via NovaEra
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

    const novaEraResponse = await fetch(`${NOVAERA_BASE_URL}/pix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': NOVAERA_PK,
        'Client-Secret': NOVAERA_SK,
      },
      body: JSON.stringify(pixData)
    });

    if (!novaEraResponse.ok) {
      throw new Error('Failed to create PIX payment');
    }

    const novaEraData = await novaEraResponse.json();

    // Salvar pagamento no banco
    const { data: payment, error: paymentError } = await supabase
      .from('checkout_payments')
      .insert({
        checkout_id: checkout.id,
        customer_name: customerName,
        customer_email: customerEmail,
        amount: checkout.amount,
        platform_fee: platformFeeAmount,
        net_amount: netAmount,
        status: 'pending',
        pix_data: novaEraData
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error('Failed to create payment record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        checkout,
        pix: novaEraData.data
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
