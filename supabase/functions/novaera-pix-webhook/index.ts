import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateWebhookSignature, validateWebhookPayload, checkRateLimit } from '../secure-webhook-validator/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Duplicate processing prevention
const processedTransactions = new Set<string>();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const WEBHOOK_SECRET = Deno.env.get('NOVAERA_WEBHOOK_SECRET') || 'default-secret';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Rate limiting check
    const clientIP = req.headers.get('cf-connecting-ip') || 
                    req.headers.get('x-forwarded-for') || 
                    'unknown';
    
    if (!checkRateLimit(clientIP, 20, 60000)) { // 20 requests per minute
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    console.log('📥 Webhook PIX recebido:', JSON.stringify(body, null, 2));

    // Validate webhook signature
    const signature = req.headers.get('x-signature') || req.headers.get('signature');
    if (signature) {
      const isValidSignature = await validateWebhookSignature(bodyText, signature, WEBHOOK_SECRET);
      if (!isValidSignature) {
        console.log('❌ Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      console.log('✅ Webhook signature validated');
    }

    // Validate payload structure
    const validation = validateWebhookPayload(body);
    if (!validation.valid) {
      console.log('❌ Invalid payload:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const transactionRef = body?.externalRef || body?.data?.externalRef || body?.externalId || body?.data?.externalId;

    if (!transactionRef) {
      console.log('❌ Referência da transação não encontrada');
      throw new Error('Transaction reference not found');
    }

    // Prevent duplicate processing
    if (processedTransactions.has(transactionRef)) {
      console.log('✅ Transaction already processed:', transactionRef);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transaction already processed',
          transactionRef
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔍 Referência encontrada:', transactionRef);

    // Verificar se é transação de checkout - se for, ignorar aqui
    if (transactionRef.startsWith('checkout_')) {
      console.log('✅ Transação de checkout ignorada no webhook de depósito');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Checkout transaction ignored in deposit webhook',
          transactionRef
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verificar se é transação de depósito válida
    if (!transactionRef.startsWith('deposit_')) {
      console.log('❌ Formato de referência de depósito inválido:', transactionRef);
      throw new Error('Invalid deposit reference format: ' + transactionRef);
    }

    const isApproved = body?.status === "approved" || 
                      body?.transaction?.status === "approved" || 
                      body?.payment?.status === "approved" ||
                      body?.status === "Compra Aprovada" ||
                      body?.data?.status === "paid";

    console.log('💳 Status do pagamento aprovado:', isApproved);

    if (!isApproved) {
      console.log('⏳ Pagamento não aprovado, ignorando webhook');
      return new Response("ok", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Mark as processed
    processedTransactions.add(transactionRef);
    
    // Clean up old processed transactions (keep last 1000)
    if (processedTransactions.size > 1000) {
      const transactionsArray = Array.from(processedTransactions);
      processedTransactions.clear();
      transactionsArray.slice(-500).forEach(tx => processedTransactions.add(tx));
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const depositId = transactionRef.replace('deposit_', '');
    console.log('🏦 ID do depósito extraído:', depositId);

    // Buscar depósito pendente
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.log('❌ Depósito não encontrado:', depositError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Deposit not found',
          depositId,
          error: depositError
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📄 Depósito encontrado:', deposit);

    // Se o depósito já foi processado, não fazer nada
    if (deposit.status === 'completed') {
      console.log('✅ Depósito já foi processado anteriormente');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Deposit already processed',
          depositId
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar a transação existente vinculada ao depósito
    const { data: existingTransaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('deposit_id', depositId)
      .eq('status', 'pending')
      .single();

    if (transactionError || !existingTransaction) {
      console.log('❌ Transação pendente não encontrada para o depósito:', transactionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Pending transaction not found for deposit',
          depositId
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📋 Transação pendente encontrada:', existingTransaction);

    // Buscar configurações de taxa do usuário
    const { data: userSettings } = await supabase
      .from('settings')
      .select('deposit_fee')
      .eq('user_id', deposit.user_id)
      .single();

    const userFeePercent = userSettings?.deposit_fee || 11.99;
    const providerFee = 1.50;
    const percentageFeeAmount = (deposit.amount * userFeePercent) / 100;
    const totalFees = percentageFeeAmount + providerFee;
    const netAmount = deposit.amount - totalFees;

    console.log('💰 Cálculo de taxas:', {
      amount: deposit.amount,
      userFeePercent,
      providerFee,
      percentageFeeAmount,
      totalFees,
      netAmount
    });

    // CRITICAL: Atualizar a transação EXISTENTE ao invés de criar nova
    const { error: updateTransactionError } = await supabase
      .from('transactions')
      .update({ 
        status: 'approved',
        amount: netAmount,
        description: `Depósito PIX - R$ ${deposit.amount} (Líquido: R$ ${netAmount.toFixed(2)})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingTransaction.id);

    if (updateTransactionError) {
      console.log('❌ Erro ao atualizar transação:', updateTransactionError);
      throw updateTransactionError;
    }

    console.log('✅ Transação atualizada para approved:', existingTransaction.id);

    // Atualizar status do depósito para completed
    const { error: updateDepositError } = await supabase
      .from('deposits')
      .update({ status: 'completed' })
      .eq('id', depositId);

    if (updateDepositError) {
      console.log('❌ Erro ao atualizar depósito:', updateDepositError);
      throw updateDepositError;
    }

    console.log('✅ Depósito atualizado para completed');

    // Atualizar saldo do usuário
    const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
      p_user_id: deposit.user_id,
      p_amount: netAmount
    });

    if (balanceError) {
      console.log('❌ Erro ao incrementar saldo:', balanceError);
      throw balanceError;
    }

    console.log('✅ Saldo do usuário incrementado:', netAmount);

    // --- Send User Webhook Notification ---
    try {
        const { data: webhookConfig, error: webhookError } = await supabase
            .from('user_webhooks')
            .select('url, secret')
            .eq('user_id', deposit.user_id)
            .eq('is_active', true)
            .maybeSingle();

        if (webhookError) {
            console.error('🔔 Error fetching webhook config:', webhookError.message);
        }

        if (webhookConfig && webhookConfig.url) {
            console.log(`🚀 Enviando webhook para: ${webhookConfig.url}`);
            const payload = {
                event: 'pix.paid',
                data: {
                    deposit_id: deposit.id,
                    transaction_id: existingTransaction.id,
                    amount: deposit.amount,
                    net_amount: netAmount,
                    paid_at: new Date().toISOString(),
                }
            };
            const payloadString = JSON.stringify(payload);
            
            const requestHeaders = { 'Content-Type': 'application/json' };
            
            if (webhookConfig.secret) {
                const encoder = new TextEncoder();
                const key = await crypto.subtle.importKey( 'raw', encoder.encode(webhookConfig.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
                const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString));
                const signatureHex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
                requestHeaders['X-Treex-Signature'] = signatureHex;
            }

            fetch(webhookConfig.url, {
                method: 'POST',
                headers: requestHeaders,
                body: payloadString,
            }).then(res => {
                console.log(`✅ Webhook response from ${webhookConfig.url}: ${res.status}`);
            }).catch(err => {
                console.error(`❌ Error sending webhook to ${webhookConfig.url}:`, err.message);
            });
        }
    } catch (e) {
        console.error('CRITICAL: Failed to send user webhook', e);
    }

    // Send OneSignal notification
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('onesignal_player_id, notifications_enabled')
        .eq('id', deposit.user_id)
        .single();

      if (profileError) {
        console.error('🔔 Erro ao buscar perfil para notificação:', profileError.message);
      } else if (profileData && profileData.onesignal_player_id && profileData.notifications_enabled) {
        console.log('🚀 Enviando notificação para o player ID:', profileData.onesignal_player_id);
        const { error: notificationError } = await supabase.functions.invoke('send-onesignal-notification', {
          body: {
            playerId: profileData.onesignal_player_id,
            title: 'Depósito Recebido!',
            message: `Seu depósito de R$ ${deposit.amount.toFixed(2)} foi confirmado. Saldo líquido de R$ ${netAmount.toFixed(2)} adicionado.`
          }
        });
        if (notificationError) {
          console.error('🔔 Erro ao enviar notificação OneSignal:', notificationError);
        } else {
          console.log('✅ Notificação enviada com sucesso.');
        }
      } else {
        console.warn('⚠️ Player ID do OneSignal não encontrado ou notificações desativadas, notificação não enviada.');
      }
    } catch(e) {
      console.error('CRITICAL: Failed to send notification', e)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deposit processed successfully - Transaction updated',
        depositId,
        transactionId: existingTransaction.id,
        netAmount,
        transactionRef
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.log('❌ Erro no webhook:', error.message);
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
