
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROVIDER_FEE = 1.50;

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

    const isApproved = body?.status === "approved" || 
                      body?.transaction?.status === "approved" || 
                      body?.payment?.status === "approved" ||
                      body?.status === "Compra Aprovada" ||
                      body?.data?.status === "paid";

    if (!isApproved) {
      return new Response("ok", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const transactionRef = body?.externalRef || 
                          body?.data?.externalRef ||
                          body?.externalId ||
                          body?.data?.externalId ||
                          body?.reference || 
                          body?.transaction_id || 
                          body?.id ||
                          body?.data?.id;

    if (!transactionRef) {
      throw new Error('Transaction reference not found');
    }

    const paidAmount = body?.data?.amount || body?.amount || body?.paidAmount;
    if (!paidAmount) {
      throw new Error('Payment amount not found');
    }

    const amountInReais = paidAmount / 100;

    let depositId = null;
    if (transactionRef.startsWith('deposit_')) {
      depositId = transactionRef.replace('deposit_', '');
    }

    if (!depositId) {
      throw new Error(`Invalid deposit reference format: ${transactionRef}`);
    }

    console.log('Processando webhook PIX NovaEra:', {
      transactionRef,
      depositId,
      amountInReais,
      timestamp: new Date().toISOString()
    });

    const { data: depositData, error: findDepositError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .eq('status', 'waiting')
      .single();

    if (findDepositError || !depositData) {
      const { data: altDeposit, error: altError } = await supabase
        .from('deposits')
        .select('*')
        .eq('amount', amountInReais)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (altError || !altDeposit) {
        throw new Error(`Deposit not found for reference: ${transactionRef}`);
      }

      await processApprovedDeposit(supabase, altDeposit, amountInReais);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'PIX payment processed successfully',
          deposit: altDeposit
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    await processApprovedDeposit(supabase, depositData, amountInReais);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'PIX payment processed successfully',
        deposit: depositData
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

async function processApprovedDeposit(supabase: any, deposit: any, amount: number) {
  console.log('Iniciando processamento de depósito aprovado:', {
    depositId: deposit.id,
    userId: deposit.user_id,
    amount,
    timestamp: new Date().toISOString()
  });

  const { data: userSettings, error: settingsError } = await supabase
    .from('settings')
    .select('deposit_fee')
    .eq('user_id', deposit.user_id)
    .single();

  if (settingsError) {
    console.log('Configurações não encontradas, usando taxa padrão');
  }

  const userDepositFee = userSettings?.deposit_fee || 0;
  const percentageFeeAmount = (amount * userDepositFee) / 100;
  const totalFees = percentageFeeAmount + PROVIDER_FEE;
  const netAmount = Math.max(0, amount - totalFees);

  console.log('Cálculo de taxas:', {
    grossAmount: amount,
    userFeePercent: userDepositFee,
    percentageFeeAmount,
    providerFee: PROVIDER_FEE,
    totalFees,
    netAmount
  });

  // Atualizar status do depósito
  const { error: updateDepositError } = await supabase
    .from('deposits')
    .update({ 
      status: 'completed'
    })
    .eq('id', deposit.id);

  if (updateDepositError) {
    throw updateDepositError;
  }

  // CORREÇÃO: Buscar e atualizar transação pendente existente ao invés de criar nova
  const { data: existingTransaction, error: findTransactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', deposit.user_id)
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!findTransactionError && existingTransaction) {
    console.log('Atualizando transação pendente existente:', existingTransaction.id);
    
    // Atualizar transação existente
    const { error: updateTransactionError } = await supabase
      .from('transactions')
      .update({
        status: 'approved',
        description: `Depósito PIX - Valor: R$ ${amount.toFixed(2)}`,
        amount: netAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingTransaction.id);

    if (updateTransactionError) {
      throw updateTransactionError;
    }

    console.log('Transação atualizada com sucesso:', {
      transactionId: existingTransaction.id,
      newAmount: netAmount,
      newStatus: 'approved'
    });
  } else {
    console.log('Nenhuma transação pendente encontrada, criando nova');
    
    // Criar nova transação apenas se não existir uma pendente
    const transactionCode = 'TXN' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    const { error: createTransactionError } = await supabase
      .from('transactions')
      .insert({
        code: transactionCode,
        user_id: deposit.user_id,
        type: 'deposit',
        description: `Depósito PIX - Valor: R$ ${amount.toFixed(2)}`,
        amount: netAmount,
        status: 'approved'
      });

    if (createTransactionError) {
      throw createTransactionError;
    }

    console.log('Nova transação criada:', {
      code: transactionCode,
      amount: netAmount,
      status: 'approved'
    });
  }

  // Atualizar saldo do usuário
  const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
    p_user_id: deposit.user_id,
    p_amount: netAmount
  });

  if (balanceError) {
    throw balanceError;
  }

  console.log('Saldo do usuário atualizado:', {
    userId: deposit.user_id,
    incrementAmount: netAmount
  });
}
