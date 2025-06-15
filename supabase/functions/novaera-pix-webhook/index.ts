
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
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    console.log('📥 Webhook PIX recebido:', JSON.stringify(body, null, 2));

    const transactionRef = body?.externalRef || body?.data?.externalRef || body?.externalId || body?.data?.externalId;

    if (!transactionRef) {
      console.log('❌ Referência da transação não encontrada');
      throw new Error('Transaction reference not found');
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

    // Send OneSignal notification
    console.log(`🔔 PIX_WEBHOOK: Iniciando processo de notificação para depósito ${depositId}`);
    try {
      console.log(`🔔 PIX_WEBHOOK: Buscando perfil do usuário ${deposit.user_id}`);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('onesignal_player_id, notifications_enabled')
        .eq('id', deposit.user_id)
        .single();

      if (profileError) {
        console.error('🔔 PIX_WEBHOOK: Erro ao buscar perfil para notificação:', profileError.message);
      } else if (profileData) {
        console.log(`🔔 PIX_WEBHOOK: Perfil encontrado. Player ID: ${profileData.onesignal_player_id}, Notificações Ativas: ${profileData.notifications_enabled}`);
        if (profileData.onesignal_player_id && profileData.notifications_enabled) {
          console.log(`🚀 PIX_WEBHOOK: Enviando notificação para o player ID: ${profileData.onesignal_player_id}`);
          const notificationPayload = {
            playerId: profileData.onesignal_player_id,
            title: 'Depósito Recebido!',
            message: `Seu depósito de R$ ${deposit.amount.toFixed(2)} foi confirmado. Saldo líquido de R$ ${netAmount.toFixed(2)} adicionado.`
          };
          console.log('🔔 PIX_WEBHOOK: Payload da notificação:', notificationPayload);
          const { error: notificationError } = await supabase.functions.invoke('send-onesignal-notification', {
            body: notificationPayload
          });
          if (notificationError) {
            console.error('🔔 PIX_WEBHOOK: Erro ao invocar a função send-onesignal-notification:', notificationError);
          } else {
            console.log('✅ PIX_WEBHOOK: Notificação enviada com sucesso.');
          }
        } else {
          console.warn(`⚠️ PIX_WEBHOOK: Notificação não enviada. Player ID: ${profileData.onesignal_player_id}, Notificações Ativas: ${profileData.notifications_enabled}`);
        }
      } else {
        console.warn(`⚠️ PIX_WEBHOOK: Perfil não encontrado para o usuário ${deposit.user_id}.`);
      }
    } catch(e) {
      console.error('CRITICAL: PIX_WEBHOOK: Falha catastrófica ao enviar notificação de depósito', e)
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
