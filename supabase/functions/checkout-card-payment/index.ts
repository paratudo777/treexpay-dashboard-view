import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { BestfyProvider } from '../_shared/payment-providers/bestfy.ts'

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

    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid JSON in request body');
    }

    const { checkoutSlug, customerName, customerEmail, cardData } = body;

    // cardData expected: { number, cvv, expiry (MM/AA), name, cpf, installments? }
    if (!checkoutSlug || !customerName) {
      throw new Error('Missing required fields: checkoutSlug and customerName');
    }
    if (!cardData || !cardData.number || !cardData.cvv || !cardData.expiry || !cardData.name || !cardData.cpf) {
      throw new Error('Missing required card fields: number, cvv, expiry, name, cpf');
    }

    console.log('💳 Processando pagamento real com cartão via Bestfy...');

    // Fetch checkout via public view
    const { data: publicCheckout, error: publicCheckoutError } = await supabase
      .from('public_checkouts')
      .select('*')
      .eq('url_slug', checkoutSlug)
      .single();

    if (publicCheckoutError || !publicCheckout) {
      throw new Error('Checkout not found or inactive');
    }

    // Get user_id
    const { data: checkout } = await supabase
      .from('checkouts')
      .select('user_id')
      .eq('id', publicCheckout.id)
      .single();

    if (!checkout) throw new Error('Failed to load checkout details');

    const userId = checkout.user_id;

    // Parse expiry MM/AA
    const expiryParts = cardData.expiry.replace(/\s/g, '').split('/');
    if (expiryParts.length !== 2) throw new Error('Invalid card expiry format. Use MM/AA');
    const [month, year] = expiryParts;

    // Split name for Bestfy (firstName / lastName)
    const nameParts = (cardData.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'NOME';
    const lastName = nameParts.slice(1).join(' ') || 'SOBRENOME';

    // Create real card payment via Bestfy
    const bestfy = new BestfyProvider();
    if (!bestfy.isAvailable()) {
      throw new Error('Bestfy provider is not configured. Credit card payments require Bestfy.');
    }

    const platformFeePercent = 3;
    const platformFeeAmount = (publicCheckout.amount * platformFeePercent) / 100;
    const netAmount = publicCheckout.amount - platformFeeAmount;

    const result = await bestfy.createCreditCard({
      amount: publicCheckout.amount,
      paymentId: `checkout_card_${publicCheckout.id}_${Date.now()}`,
      customer: {
        name: cardData.name,
        email: customerEmail || 'noreply@treexpay.site',
        phone: '5511999999999',
        document: cardData.cpf.replace(/\D/g, ''),
      },
      card: {
        number: cardData.number.replace(/\s/g, ''),
        cvv: cardData.cvv,
        firstName,
        lastName,
        month,
        year: year.length === 2 ? `20${year}` : year,
        installments: cardData.installments || 1,
      },
      description: publicCheckout.title,
      webhookUrl: `${SUPABASE_URL}/functions/v1/bestfy-webhook`,
      metadata: { origin: 'TreexPay Checkout Card', checkout_id: publicCheckout.id },
    });

    console.log('💳 Bestfy card response:', JSON.stringify(result));

    // Determine status from Bestfy response
    // Bestfy may return immediate approval or pending (webhook will update)
    const rawStatus = (result.raw as any)?.status || result.status || 'PENDING';
    const isPaid = ['PAID', 'APPROVED', 'approved'].includes(rawStatus);
    const isFailed = ['REJECTED', 'REFUSED', 'DECLINED', 'refused', 'declined'].includes(rawStatus);

    const paymentStatus = isPaid ? 'paid' : isFailed ? 'failed' : 'pending';
    const paidAt = isPaid ? new Date().toISOString() : null;

    // Save checkout_payment
    const { data: payment, error: paymentError } = await supabase
      .from('checkout_payments')
      .insert({
        checkout_id: publicCheckout.id,
        customer_name: customerName.trim(),
        customer_email: customerEmail || null,
        amount: publicCheckout.amount,
        platform_fee: platformFeeAmount,
        net_amount: netAmount,
        status: paymentStatus,
        payment_method: 'credit_card',
        card_data: {
          last4: cardData.number.replace(/\s/g, '').slice(-4),
          brand: detectCardBrand(cardData.number.replace(/\s/g, '')),
          installments: cardData.installments || 1,
          bestfy_transaction_id: result.financialTransactionId,
        },
        paid_at: paidAt,
        expires_at: new Date(Date.now() + 600000).toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Erro ao criar pagamento:', paymentError);
      throw new Error('Failed to create payment: ' + paymentError.message);
    }

    // Create transaction if paid
    if (isPaid) {
      const transactionCode = 'CRD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      await supabase.from('transactions').insert({
        code: transactionCode,
        user_id: userId,
        type: 'payment',
        description: `Venda Cartão: ${publicCheckout.title} - Cliente: ${customerName}`,
        amount: netAmount,
        status: 'approved',
      });
      // Credit seller balance
      await supabase.rpc('incrementar_saldo_usuario', { p_user_id: userId, p_amount: netAmount });
    } else if (!isFailed) {
      // Pending - create pending transaction (webhook will confirm)
      const transactionCode = 'CRD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      await supabase.from('transactions').insert({
        code: transactionCode,
        user_id: userId,
        type: 'payment',
        description: `Venda Cartão: ${publicCheckout.title} - Cliente: ${customerName} (Aguardando)`,
        amount: netAmount,
        status: 'pending',
      });
    }

    console.log('✅ Pagamento com cartão processado:', payment.id, 'status:', paymentStatus);

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          status: paymentStatus,
          amount: payment.amount,
        },
        provider: 'bestfy',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function detectCardBrand(number: string): string {
  if (/^4/.test(number)) return 'Visa';
  if (/^5[1-5]/.test(number)) return 'Mastercard';
  if (/^3[47]/.test(number)) return 'Amex';
  if (/^(636368|438935|504175|451416|636297)/.test(number)) return 'Elo';
  if (/^6(?:011|5)/.test(number)) return 'Discover';
  return 'Unknown';
}
