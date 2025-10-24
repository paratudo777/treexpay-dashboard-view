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
      console.error('❌ Variáveis de ambiente ausentes');
      throw new Error('Missing environment variables');
    }

    console.log('🔐 Iniciando processamento de pagamento com cartão...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('❌ Erro ao parsear JSON:', jsonError);
      throw new Error('Invalid JSON in request body');
    }

    const { checkoutSlug, customerName, customerEmail, cardData, paymentStatus = 'paid' } = body;

    console.log('📦 Dados recebidos:', { 
      checkoutSlug, 
      customerName, 
      customerEmail: customerEmail ? 'presente' : 'ausente',
      cardData: cardData ? 'presente' : 'ausente',
      paymentStatus 
    });

    // Validar dados obrigatórios
    if (!checkoutSlug || !customerName) {
      console.error('❌ Dados obrigatórios ausentes:', { checkoutSlug: !!checkoutSlug, customerName: !!customerName });
      throw new Error('Missing required fields: checkoutSlug and customerName');
    }

    // Buscar checkout
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('*')
      .eq('url_slug', checkoutSlug)
      .eq('active', true)
      .single();

    if (checkoutError || !checkout) {
      console.error('❌ Checkout não encontrado:', checkoutError);
      throw new Error('Checkout not found or inactive');
    }

    console.log('✅ Checkout encontrado:', { title: checkout.title, amount: checkout.amount });

    // Determinar status baseado no paymentStatus
    const status = paymentStatus === 'approved' ? 'paid' : (paymentStatus === 'declined' ? 'failed' : 'pending');
    const paidAt = status === 'paid' ? new Date().toISOString() : null;

    console.log('💳 Criando registro de pagamento com status:', status);

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
        status: status,
        payment_method: 'credit_card',
        card_data: cardData || null,
        paid_at: paidAt,
        expires_at: new Date(Date.now() + 600000).toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erro ao criar pagamento:', paymentError);
      throw new Error('Failed to create payment: ' + paymentError.message);
    }

    console.log('✅ Pagamento criado com sucesso! ID:', payment.id);
    console.log('🎯 Triggers irão processar transação e saldo automaticamente');

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
