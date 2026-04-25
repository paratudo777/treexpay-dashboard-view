
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createPixWithProvider } from '../_shared/payment-providers/registry.ts'

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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    const { checkoutSlug, customerName, customerEmail } = body;

    if (!checkoutSlug) throw new Error('Checkout slug is required');
    if (!customerName || !customerName.trim() || customerName.trim().length < 3) {
      throw new Error('Nome do cliente deve ter pelo menos 3 caracteres');
    }

    // Fetch checkout (public view)
    const { data: publicCheckout, error: publicCheckoutError } = await supabase
      .from('public_checkouts')
      .select('*')
      .eq('url_slug', checkoutSlug)
      .single();

    if (publicCheckoutError || !publicCheckout) throw new Error('Checkout not found or inactive');

    // Fetch owner
    const { data: checkout } = await supabase
      .from('checkouts')
      .select('user_id')
      .eq('id', publicCheckout.id)
      .single();

    if (!checkout) throw new Error('Failed to load checkout details');

    const userId = checkout.user_id;

    // Fetch seller profile
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('id, name, email, phone, cpf')
      .eq('id', userId)
      .single();

    if (!sellerProfile) throw new Error('Seller profile not found');
    if (!sellerProfile.cpf) throw new Error('Vendedor não possui CPF cadastrado');
    if (!sellerProfile.phone) throw new Error('Vendedor não possui telefone cadastrado');
    if (!isValidCpf(sellerProfile.cpf)) throw new Error('CPF do vendedor é inválido');

    // Resolve provider for this user
    const { data: providerData } = await supabase.rpc('resolve_user_provider', { p_user_id: userId });
    const providerName = providerData || 'novaera';
    console.log(`[checkout-pix] Resolved provider for user ${userId}: ${providerName}`);

    const platformFeePercent = 3;
    const platformFeeAmount = (publicCheckout.amount * platformFeePercent) / 100;
    const netAmount = publicCheckout.amount - platformFeeAmount;

    const externalRef = `checkout_${publicCheckout.id}_${Date.now()}`;

    const webhookUrl = providerName === 'bestfy'
      ? `${SUPABASE_URL}/functions/v1/bestfy-webhook`
      : `${SUPABASE_URL}/functions/v1/checkout-pix-webhook`;

    const pixResult = await createPixWithProvider(providerName, {
      amount: publicCheckout.amount,
      paymentId: externalRef,
      webhookUrl,
      description: publicCheckout.title,
      customer: {
        name: sellerProfile.name,
        email: 'noreply@treexpay.site',
        phone: sellerProfile.phone,
        document: sellerProfile.cpf,
      },
      metadata: { origin: 'TreexPay Checkout', checkout_id: publicCheckout.id },
    })

    // Save checkout payment
    const pixData = providerName === 'bestfy'
      ? { financialTransactionId: pixResult.external_id, qrCode: pixResult.qr_code, qrCodeText: pixResult.pix_code, provider: 'bestfy' }
      : pixResult.raw;

    const { data: payment, error: paymentError } = await supabase
      .from('checkout_payments')
      .insert({
        checkout_id: publicCheckout.id,
        customer_name: customerName.trim(),
        customer_email: customerEmail?.trim() || null,
        amount: publicCheckout.amount,
        platform_fee: platformFeeAmount,
        net_amount: netAmount,
        status: 'pending',
        pix_data: pixData,
      })
      .select()
      .single();

    if (paymentError) throw new Error('Failed to create payment record');

    // Create pending transaction
    const transactionCode = 'CHK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    await supabase.from('transactions').insert({
      code: transactionCode,
      user_id: userId,
      type: 'payment',
      description: `Venda Checkout: ${publicCheckout.title} - Cliente: ${customerName} (Aguardando pagamento)`,
      amount: netAmount,
      status: 'pending',
      deposit_id: null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        checkout: publicCheckout,
        externalRef,
        provider: pixResult.provider,
        pix: {
          qrcode: pixResult.qr_code,
          qrcodeText: pixResult.pix_code,
          expiresAt: pixResult.expires_at,
          expirationDate: pixResult.expires_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as any)?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
