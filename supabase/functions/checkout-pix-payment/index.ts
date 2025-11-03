
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

    // Buscar checkout usando view pública primeiro para validar
    const { data: publicCheckout, error: publicCheckoutError } = await supabase
      .from('public_checkouts')
      .select('*')
      .eq('url_slug', checkoutSlug)
      .single();

    if (publicCheckoutError || !publicCheckout) {
      throw new Error('Checkout not found or inactive');
    }

    // Agora buscar dados completos do checkout usando service role
    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .select('user_id')
      .eq('id', publicCheckout.id)
      .single();

    if (checkoutError) {
      throw new Error('Failed to load checkout details');
    }

    // Combinar dados públicos com user_id
    const fullCheckout = { ...publicCheckout, user_id: checkout.user_id };

    // Buscar informações do vendedor (dono do checkout)
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('id, name, email, phone, cpf')
      .eq('id', fullCheckout.user_id)
      .single();

    if (sellerError || !sellerProfile) {
      throw new Error('Seller profile not found');
    }

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

    const amountInCents = Math.round(publicCheckout.amount * 100);

    // Configurar taxa da plataforma (3% padrão)
    const platformFeePercent = 3; // 3%
    const platformFeeAmount = (publicCheckout.amount * platformFeePercent) / 100;
    const netAmount = publicCheckout.amount - platformFeeAmount;

    // Preparar autenticação Basic
    const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`);
    const authHeader = `Basic ${credentials}`;

    const externalRef = `checkout_${publicCheckout.id}_${Date.now()}`;

    // URL corrigida para o webhook de checkout
    const postbackUrl = `${SUPABASE_URL}/functions/v1/checkout-pix-webhook`;

    // Usar email genérico para evitar envio de notificações desnecessárias
    // Se customerEmail foi fornecido, usar ele apenas para fins de registro interno
    const pixPayload = {
      amount: amountInCents,
      paymentMethod: "pix",
      externalRef: externalRef,
      postbackUrl: postbackUrl,
      customer: {
        name: sellerProfile.name,
        email: "noreply@treexpay.site", // Email genérico para evitar notificações
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
          title: publicCheckout.title, 
          quantity: 1, 
          tangible: false, 
          unitPrice: amountInCents 
        }
      ],
      metadata: "{\"origin\":\"TreexPay Checkout\"}",
      traceable: false,
      // IMPORTANTE: Desabilitar notificações automáticas
      notifications: {
        email: false,
        sms: false
      }
    };

    // Usar o mesmo endpoint que funciona no depósito: /transactions
    const novaEraResponse = await fetch(`${NOVAERA_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixPayload)
    });

    if (!novaEraResponse.ok) {
      const errorText = await novaEraResponse.text();
      throw new Error(`Failed to create PIX payment: ${errorText}`);
    }

    const novaEraData = await novaEraResponse.json();

    // Salvar pagamento no banco
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
        pix_data: novaEraData
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error('Failed to create payment record');
    }

    // Criar transação PENDENTE no banco para o vendedor
    const transactionCode = 'CHK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    const { error: createTransactionError } = await supabase
      .from('transactions')
      .insert({
        code: transactionCode,
        user_id: fullCheckout.user_id,
        type: 'payment',
        description: `Venda Checkout: ${publicCheckout.title} - Cliente: ${customerName} (Aguardando pagamento)`,
        amount: netAmount,
        status: 'pending',
        deposit_id: null
      });

    if (createTransactionError) {
      // Não falha o processo, apenas loga o erro
    }

    // Retornar dados no formato esperado pela página de checkout
    return new Response(
      JSON.stringify({
        success: true,
        payment,
        checkout: publicCheckout, // Retornar apenas dados públicos
        externalRef,
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
