
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROVIDER_FEE = 1.50; // Taxa fixa do provedor por transação

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('🚀 Webhook NovaEra PIX recebido:', JSON.stringify(body, null, 2));

    // Verificar se é um pagamento PIX aprovado
    const isApproved = body?.status === "approved" || 
                      body?.transaction?.status === "approved" || 
                      body?.payment?.status === "approved" ||
                      body?.status === "Compra Aprovada" ||
                      body?.data?.status === "paid";

    if (!isApproved) {
      console.log('⚠️ Webhook ignorado - não é um pagamento aprovado. Status:', body?.status || body?.data?.status);
      return new Response("ok", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Buscar referência/ID da transação
    const transactionRef = body?.externalRef || 
                          body?.data?.externalRef ||
                          body?.externalId ||
                          body?.data?.externalId ||
                          body?.reference || 
                          body?.transaction_id || 
                          body?.id ||
                          body?.data?.id;

    if (!transactionRef) {
      console.error('❌ Referência da transação não encontrada no webhook NovaEra PIX');
      throw new Error('Transaction reference not found');
    }

    console.log('💰 Processando pagamento PIX aprovado para referência:', transactionRef);

    // Extrair valor do pagamento
    const paidAmount = body?.data?.amount || body?.amount || body?.paidAmount;
    if (!paidAmount) {
      console.error('❌ Valor do pagamento não encontrado');
      throw new Error('Payment amount not found');
    }

    // Converter de centavos para reais
    const amountInReais = paidAmount / 100;

    // Extrair o ID do depósito da referência (formato: deposit_UUID)
    let depositId = null;
    if (transactionRef.startsWith('deposit_')) {
      depositId = transactionRef.replace('deposit_', '');
    }

    if (!depositId) {
      console.error('❌ ID do depósito não encontrado na referência:', transactionRef);
      throw new Error(`Invalid deposit reference format: ${transactionRef}`);
    }

    // Buscar o depósito na tabela deposits usando o ID
    const { data: depositData, error: findDepositError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .eq('status', 'waiting')
      .single();

    if (findDepositError || !depositData) {
      console.error('❌ Depósito não encontrado ou já processado:', findDepositError);
      
      // Tentar buscar por valor e data próxima como fallback
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

      console.log('✅ Depósito encontrado por valor:', altDeposit);

      // Usar o depósito encontrado
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

    console.log('✅ Depósito encontrado:', depositData);

    // Processar o depósito aprovado
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
    console.error('❌ Erro no webhook NovaEra PIX:', error);
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
  // 1. Buscar as configurações de taxa do usuário
  const { data: userSettings, error: settingsError } = await supabase
    .from('settings')
    .select('deposit_fee')
    .eq('user_id', deposit.user_id)
    .single();

  if (settingsError) {
    console.error('❌ Erro ao buscar configurações do usuário:', settingsError);
    // Se não encontrar configurações, usar taxa 0
  }

  const userDepositFee = userSettings?.deposit_fee || 0;
  console.log(`💼 Taxa do usuário: ${userDepositFee}%`);

  // 2. Calcular o valor líquido após descontar as taxas
  const feeAmount = (amount * userDepositFee) / 100; // Taxa percentual
  const totalFees = feeAmount + PROVIDER_FEE; // Taxa percentual + taxa fixa
  const netAmount = Math.max(0, amount - totalFees); // Não permitir saldo negativo

  console.log(`💰 Cálculo de taxas:`);
  console.log(`   Valor bruto: R$ ${amount.toFixed(2)}`);
  console.log(`   Taxa usuário (${userDepositFee}%): R$ ${feeAmount.toFixed(2)}`);
  console.log(`   Taxa provedor: R$ ${PROVIDER_FEE.toFixed(2)}`);
  console.log(`   Total taxas: R$ ${totalFees.toFixed(2)}`);
  console.log(`   Valor líquido: R$ ${netAmount.toFixed(2)}`);

  // 3. Atualizar status do depósito para "completed"
  const { error: updateDepositError } = await supabase
    .from('deposits')
    .update({ 
      status: 'completed'
    })
    .eq('id', deposit.id);

  if (updateDepositError) {
    console.error('❌ Erro ao atualizar depósito:', updateDepositError);
    throw updateDepositError;
  }

  console.log('✅ Status do depósito atualizado para completed');

  // 4. Gerar código único para a transação
  const transactionCode = 'TXN' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  // 5. Criar transação na tabela transactions
  const { error: createTransactionError } = await supabase
    .from('transactions')
    .insert({
      code: transactionCode,
      user_id: deposit.user_id,
      type: 'deposit',
      description: `Depósito PIX NovaEra - Taxa: ${userDepositFee}% (R$ ${feeAmount.toFixed(2)}) + Taxa Provedor: R$ ${PROVIDER_FEE.toFixed(2)}`,
      amount: netAmount, // Valor já com taxas descontadas
      status: 'approved'
    });

  if (createTransactionError) {
    console.error('❌ Erro ao criar transação:', createTransactionError);
    throw createTransactionError;
  }

  console.log('✅ Transação criada com sucesso:', transactionCode);

  // 6. Incrementar saldo do usuário com o valor líquido (já com taxas descontadas)
  const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
    p_user_id: deposit.user_id,
    p_amount: netAmount
  });

  if (balanceError) {
    console.error('❌ Erro ao incrementar saldo:', balanceError);
    throw balanceError;
  }

  console.log(`💰 Saldo incrementado para usuário ${deposit.user_id}: +R$ ${netAmount.toFixed(2)} (líquido após taxas)`);
}
