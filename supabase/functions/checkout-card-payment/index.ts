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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    const { checkoutSlug, customerName, customerEmail, cardData } = body;

    // Buscar checkout
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('url_slug', checkoutSlug)
      .eq('active', true)
      .single();

    if (checkoutError || !checkout) {
      throw new Error('Checkout not found');
    }

    // Criar pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('checkout_payments')
      .insert({
        checkout_id: checkout.id,
        customer_name: customerName,
        customer_email: customerEmail || null,
        amount: checkout.amount,
        platform_fee: 0,
        net_amount: checkout.amount,
        status: 'paid',
        payment_method: 'credit_card',
        card_data: cardData,
        paid_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 600000).toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error('Failed to create payment');
    }

    return new Response(
      JSON.stringify({ success: true, payment }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
