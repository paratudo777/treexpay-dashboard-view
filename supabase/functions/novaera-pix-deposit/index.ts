
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
    const { amount, userId, userName, userEmail, userPhone, userCpf } = await req.json();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
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

    // Resolve which provider to use for this user
    const { data: providerData } = await supabase.rpc('resolve_user_provider', { p_user_id: userId });
    const providerName = providerData || 'novaera';
    console.log(`[deposit] Resolved provider for user ${userId}: ${providerName}`);

    // Create deposit record — trigger will create the pending transaction
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
        JSON.stringify({ success: false, error: depositError, message: 'Deposit creation failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Determine webhook URL based on provider
    const webhookUrl = providerName === 'bestfy'
      ? `${SUPABASE_URL}/functions/v1/bestfy-webhook`
      : `${SUPABASE_URL}/functions/v1/novaera-pix-webhook`;

    const pixResult = await createPixWithProvider(providerName, {
      amount: Number(amount),
      paymentId: depositData.id,
      webhookUrl,
      description: 'Depósito TreexPay',
      customer: {
        name: userName,
        email: userEmail || 'noreply@treexpay.site',
        phone: userPhone || '5511999999999',
        document: cpfToValidate,
      },
      metadata: { origin: 'TreexPay Deposit', deposit_id: depositData.id },
    });

    // Store QR code with provider transaction ID suffix for later verification
    const qrCodeValue = `${pixResult.qr_code}|${pixResult.provider}:${pixResult.external_id}`;

    await supabase
      .from('deposits')
      .update({ qr_code: qrCodeValue })
      .eq('id', depositData.id);

    return new Response(
      JSON.stringify({
        success: true,
        deposit: { ...depositData, qr_code: pixResult.qr_code },
        provider: pixResult.provider,
        pix: {
          qrCode: pixResult.qr_code,
          qrCodeText: pixResult.pix_code,
          expiresAt: pixResult.expires_at,
        },
        // Legacy compatibility for novaera format
        novaera: pixResult.provider === 'novaera' ? pixResult.raw : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
