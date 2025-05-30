
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

    const transactionRef = body?.externalRef || body?.data?.externalRef || body?.externalId || body?.data?.externalId;

    if (!transactionRef) {
      throw new Error('Transaction reference not found');
    }

    // Verificar se é transação de checkout - se for, ignorar aqui
    if (transactionRef.startsWith('checkout_')) {
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
      throw new Error('Invalid deposit reference format: ' + transactionRef);
    }

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

    const depositId = transactionRef.replace('deposit_', '');

    // Buscar depósito pendente
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .eq('status', 'waiting')
      .single();

    if (depositError || !deposit) {
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

    // IMPORTANTE: NÃO criar nova transação aqui
    // A transação já existe e será atualizada pelo trigger do banco
    // Apenas atualizar o status do depósito para 'completed'
    const { error: updateDepositError } = await supabase
      .from('deposits')
      .update({ status: 'completed' })
      .eq('id', depositId);

    if (updateDepositError) {
      throw updateDepositError;
    }

    // Atualizar saldo do usuário
    const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
      p_user_id: deposit.user_id,
      p_amount: netAmount
    });

    if (balanceError) {
      throw balanceError;
    }

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
