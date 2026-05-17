import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { BestfyProvider } from '../_shared/payment-providers/bestfy.ts'
import { StripeProvider } from '../_shared/payment-providers/stripe.ts'

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

    const { checkoutSlug, customerName, customerEmail, cardData, customerPhone, customerDocument, customerAddress } = body;

    // Capture client context for anti-fraud
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || req.headers.get('cf-connecting-ip')
      || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    // cardData expected: { number, cvv, expiry (MM/AA), name, cpf, installments? }
    if (!checkoutSlug || !customerName) {
      throw new Error('Missing required fields: checkoutSlug and customerName');
    }
    if (!cardData || !cardData.number || !cardData.cvv || !cardData.expiry || !cardData.name || !cardData.cpf) {
      throw new Error('Missing required card fields: number, cvv, expiry, name, cpf');
    }

    // Backend validation of required customer fields
    const nameParts_ = (customerName || '').trim().split(/\s+/).filter(Boolean);
    if (nameParts_.length < 2) {
      throw new Error('Nome completo deve conter pelo menos nome e sobrenome');
    }
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new Error('E-mail inválido');
    }
    const docDigits = (customerDocument || cardData.cpf || '').replace(/\D/g, '');
    if (docDigits.length !== 11 && docDigits.length !== 14) {
      throw new Error('CPF/CNPJ inválido');
    }
    const phoneDigits = (customerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      throw new Error('Telefone inválido');
    }
    if (customerAddress) {
      const { cep, street, number, neighborhood, city, state } = customerAddress;
      if (!cep || cep.replace(/\D/g, '').length !== 8) throw new Error('CEP inválido');
      if (!street || !number || !neighborhood || !city || !state) {
        throw new Error('Endereço incompleto: todos os campos são obrigatórios');
      }
    } else {
      throw new Error('Dados de endereço são obrigatórios');
    }

    console.log('💳 Processando pagamento com cartão... IP:', clientIp || 'unknown');

    // Fetch checkout via public view
    const { data: publicCheckout, error: publicCheckoutError } = await supabase
      .from('public_checkouts')
      .select('*')
      .eq('url_slug', checkoutSlug)
      .single();

    if (publicCheckoutError || !publicCheckout) {
      throw new Error('Checkout not found or inactive');
    }
    if (Number(publicCheckout.amount) < 3) {
      throw new Error('Valor mínimo do checkout é R$ 3,00');
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

    // Resolve provider for this user (card)
    const { data: providerData } = await supabase.rpc('resolve_user_provider', { p_user_id: userId });
    let providerName = (providerData as string) || 'bestfy';
    // Apenas bestfy e stripe suportam cartão. Se cair em novaera/arkama, usa bestfy.
    if (providerName !== 'bestfy' && providerName !== 'stripe') {
      console.log(`[checkout-card] Provider '${providerName}' não suporta cartão. Usando 'bestfy'.`);
      providerName = 'bestfy';
    }
    console.log(`[checkout-card] Provider resolvido: ${providerName}`);

    const platformFeePercent = 3;
    const platformFeeAmount = (publicCheckout.amount * platformFeePercent) / 100;
    const netAmount = publicCheckout.amount - platformFeeAmount;

    const cardParams = {
      amount: publicCheckout.amount,
      paymentId: `checkout_card_${publicCheckout.id}_${Date.now()}`,
      customer: {
        name: cardData.name,
        email: customerEmail || 'noreply@treexpay.site',
        phone: customerPhone || phoneDigits || '5511999999999',
        document: docDigits,
        ip: clientIp,
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
      metadata: { checkout_id: publicCheckout.id },
      clientIp,
      userAgent,
    };

    let result: { financialTransactionId: string; status: string; provider: string; raw: unknown };

    if (providerName === 'stripe') {
      const stripe = new StripeProvider();
      if (!stripe.isAvailable()) {
        throw new Error('Stripe provider is not configured. Set STRIPE_SECRET_KEY.');
      }
      result = await stripe.createCreditCard(cardParams);
    } else {
      const bestfy = new BestfyProvider();
      if (!bestfy.isAvailable()) {
        throw new Error('Bestfy provider is not configured.');
      }
      result = await bestfy.createCreditCard({
        ...cardParams,
        webhookUrl: `${SUPABASE_URL}/functions/v1/bestfy-webhook`,
        metadata: { origin: 'TreexPay Checkout Card', checkout_id: publicCheckout.id, source: 'checkout_web' },
      });
    }

    console.log(`💳 ${providerName} card response status:`, result.status);

    // Normalize status across providers
    const rawStatus = (result.raw as any)?.status || result.status || 'pending';
    const isPaid = ['PAID', 'APPROVED', 'approved', 'succeeded'].includes(rawStatus);
    const isFailed = ['REJECTED', 'REFUSED', 'DECLINED', 'refused', 'declined', 'canceled', 'requires_payment_method'].includes(rawStatus);

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
          provider: providerName,
          provider_transaction_id: result.financialTransactionId,
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

    // Transaction creation and balance credit are handled by DB triggers:
    // - process_checkout_card_payment (on INSERT)
    // - update_checkout_card_payment_status (on UPDATE)

    console.log('✅ Pagamento com cartão processado:', payment.id, 'status:', paymentStatus);

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          status: paymentStatus,
          amount: payment.amount,
        },
        provider: providerName,
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
