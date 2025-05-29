
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

    console.log('Webhook PIX NovaEra recebido:', JSON.stringify(body, null, 2));

    const transactionRef = body?.externalRef || body?.data?.externalRef || body?.externalId || body?.data?.externalId;

    if (!transactionRef) {
      console.error('Transaction reference not found in webhook payload');
      throw new Error('Transaction reference not found');
    }

    console.log('Referência da transação encontrada:', transactionRef);

    // Verificar se é transação de checkout - se for, ignorar aqui
    if (transactionRef.startsWith('checkout_')) {
      console.log('Transação de checkout detectada, ignorando no webhook de depósito:', transactionRef);
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
      console.log('Referência inválida para depósito:', transactionRef);
      throw new Error('Invalid deposit reference format: ' + transactionRef);
    }

    const isApproved = body?.status === "approved" || 
                      body?.transaction?.status === "approved" || 
                      body?.payment?.status === "approved" ||
                      body?.status === "Compra Aprovada" ||
                      body?.data?.status === "paid";

    if (!isApproved) {
      console.log('Pagamento não aprovado, status:', body?.status || body?.data?.status);
      return new Response("ok", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const depositId = transactionRef.replace('deposit_', '');
    const paidAmount = body?.data?.amount || body?.amount || body?.paidAmount;
    
    if (!paidAmount) {
      throw new Error('Payment amount not found');
    }

    const amountInReais = paidAmount / 100;

    console.log('Processando webhook PIX NovaEra:', {
      transactionRef,
      depositId,
      amountInReais,
      timestamp: new Date().toISOString()
    });

    // Buscar depósito pendente
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .eq('status', 'waiting')
      .single();

    if (depositError || !deposit) {
      console.log('Depósito não encontrado ou já processado:', {
        depositId,
        error: depositError?.message,
        timestamp: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Deposit not found or already processed',
          depositId
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Iniciando processamento de depósito aprovado:', {
      depositId: deposit.id,
      userId: deposit.user_id,
      amount: deposit.amount,
      timestamp: new Date().toISOString()
    });

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

    console.log('Cálculo de taxas:', {
      grossAmount: deposit.amount,
      userFeePercent,
      percentageFeeAmount,
      providerFee,
      totalFees,
      netAmount
    });

    // Criar nova transação
    console.log('Criando nova transação para depósito:', depositId);
    const transactionCode = 'TXN' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    const { error: createTransactionError } = await supabase
      .from('transactions')
      .insert({
        code: transactionCode,
        user_id: deposit.user_id,
        type: 'deposit',
        description: `Depósito PIX - R$ ${deposit.amount.toFixed(2)} (Líquido: R$ ${netAmount.toFixed(2)})`,
        amount: netAmount,
        status: 'approved',
        deposit_id: deposit.id
      });

    if (createTransactionError) {
      console.error('Erro ao criar transação:', createTransactionError);
      throw createTransactionError;
    }

    console.log('Nova transação criada:', {
      code: transactionCode,
      originalAmount: deposit.amount,
      netAmount,
      status: 'approved',
      depositRef: depositId
    });

    // Atualizar saldo do usuário
    const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
      p_user_id: deposit.user_id,
      p_amount: netAmount
    });

    if (balanceError) {
      console.error('Erro ao incrementar saldo:', balanceError);
      throw balanceError;
    }

    console.log('Saldo do usuário atualizado:', {
      userId: deposit.user_id,
      incrementAmount: netAmount,
      depositRef: depositId
    });

    // Atualizar status do depósito para completed
    const { error: updateDepositError } = await supabase
      .from('deposits')
      .update({ status: 'completed' })
      .eq('id', depositId);

    if (updateDepositError) {
      console.error('Erro ao atualizar depósito:', updateDepositError);
      throw updateDepositError;
    }

    console.log('Depósito processado com sucesso:', {
      depositId,
      netAmount,
      userId: deposit.user_id,
      transactionRef
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Deposit processed successfully',
        depositId,
        netAmount,
        transactionRef
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no webhook PIX NovaEra:', error);
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
