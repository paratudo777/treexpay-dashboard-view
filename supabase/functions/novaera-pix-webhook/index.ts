
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

    // CORREÇÃO PRINCIPAL: Buscar depósito específico pelo externalRef único
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

    // Buscar o depósito específico pelo ID único e status waiting
    const { data: depositData, error: findDepositError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .eq('status', 'waiting')
      .single();

    if (findDepositError || !depositData) {
      console.log('Depósito não encontrado ou já processado:', {
        depositId,
        error: findDepositError?.message,
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

    // Verificar se o valor do pagamento confere com o valor do depósito
    if (depositData.amount !== amountInReais) {
      console.log('Valor do pagamento não confere:', {
        depositAmount: depositData.amount,
        paidAmount: amountInReais,
        timestamp: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payment amount mismatch',
          expected: depositData.amount,
          received: amountInReais
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    await processApprovedDeposit(supabase, depositData, amountInReais);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'PIX payment processed successfully',
        deposit: depositData,
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

async function processApprovedDeposit(supabase: any, deposit: any, amount: number) {
  console.log('Iniciando processamento de depósito aprovado:', {
    depositId: deposit.id,
    userId: deposit.user_id,
    amount,
    timestamp: new Date().toISOString()
  });

  // Verificar se o depósito já foi processado (proteção adicional)
  const { data: currentDeposit } = await supabase
    .from('deposits')
    .select('status')
    .eq('id', deposit.id)
    .single();

  if (currentDeposit?.status !== 'waiting') {
    console.log('Depósito já processado anteriormente:', {
      depositId: deposit.id,
      currentStatus: currentDeposit?.status
    });
    return;
  }

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

  // Atualizar status do depósito para 'completed' de forma atômica
  const { error: updateDepositError } = await supabase
    .from('deposits')
    .update({ 
      status: 'completed'
    })
    .eq('id', deposit.id)
    .eq('status', 'waiting'); // Condição adicional para evitar race conditions

  if (updateDepositError) {
    throw updateDepositError;
  }

  // CORREÇÃO PRINCIPAL: Buscar transação existente específica para este depósito
  const { data: existingTransaction, error: findTransactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', deposit.user_id)
    .eq('type', 'deposit')
    .eq('status', 'pending')
    .gte('created_at', deposit.created_at) // Criada após ou junto com o depósito
    .order('created_at', { ascending: true })
    .limit(1);

  if (!findTransactionError && existingTransaction && existingTransaction.length > 0) {
    const transactionToUpdate = existingTransaction[0];
    
    console.log('Atualizando transação específica encontrada:', transactionToUpdate.id);
    
    // Atualizar transação específica encontrada
    const { error: updateTransactionError } = await supabase
      .from('transactions')
      .update({
        status: 'approved',
        description: `Depósito PIX - Valor: R$ ${amount.toFixed(2)} (Ref: ${deposit.id})`,
        amount: netAmount, // Valor líquido
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionToUpdate.id)
      .eq('status', 'pending'); // Condição adicional de segurança

    if (updateTransactionError) {
      throw updateTransactionError;
    }

    console.log('Transação atualizada com sucesso:', {
      transactionId: transactionToUpdate.id,
      originalAmount: amount,
      netAmount: netAmount,
      newStatus: 'approved',
      depositRef: deposit.id
    });
  } else {
    console.log('Criando nova transação para depósito:', deposit.id);
    
    // Criar nova transação se não encontrar uma pendente específica
    const transactionCode = 'TXN' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    const { error: createTransactionError } = await supabase
      .from('transactions')
      .insert({
        code: transactionCode,
        user_id: deposit.user_id,
        type: 'deposit',
        description: `Depósito PIX - Valor: R$ ${amount.toFixed(2)} (Ref: ${deposit.id})`,
        amount: netAmount,
        status: 'approved'
      });

    if (createTransactionError) {
      throw createTransactionError;
    }

    console.log('Nova transação criada:', {
      code: transactionCode,
      originalAmount: amount,
      netAmount: netAmount,
      status: 'approved',
      depositRef: deposit.id
    });
  }

  // Atualizar saldo do usuário com valor líquido
  const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
    p_user_id: deposit.user_id,
    p_amount: netAmount
  });

  if (balanceError) {
    throw balanceError;
  }

  console.log('Saldo do usuário atualizado:', {
    userId: deposit.user_id,
    incrementAmount: netAmount,
    depositRef: deposit.id
  });
}
