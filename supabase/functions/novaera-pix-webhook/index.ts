
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Buscar a transação no Supabase pela referência
    const { data: transaction, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('code', transactionRef)
      .eq('status', 'pending')
      .single();

    if (findError || !transaction) {
      console.error('❌ Transação não encontrada ou já processada:', findError);
      // Tentar buscar por ID se não encontrar pelo code
      const { data: altTransaction, error: altError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionRef)
        .eq('status', 'pending')
        .single();

      if (altError || !altTransaction) {
        throw new Error(`Transaction not found for reference: ${transactionRef}`);
      }
      
      // Usar a transação encontrada pelo ID alternativo
      const foundTransaction = altTransaction;
      console.log('✅ Transação encontrada pelo ID:', foundTransaction);

      // Atualizar status da transação para aprovado
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', foundTransaction.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar transação:', updateError);
        throw updateError;
      }

      console.log('✅ Transação atualizada para aprovado');

      // Se for um depósito, incrementar saldo do usuário usando a função SQL
      if (foundTransaction.type === 'deposit') {
        const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
          p_user_id: foundTransaction.user_id,
          p_amount: foundTransaction.amount
        });

        if (balanceError) {
          console.error('❌ Erro ao incrementar saldo:', balanceError);
          throw balanceError;
        } else {
          console.log(`💰 Saldo incrementado para usuário ${foundTransaction.user_id}: +${foundTransaction.amount}`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'PIX payment processed successfully',
          transaction: foundTransaction
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Transação encontrada pelo code:', transaction);

    // Atualizar status da transação para aprovado
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar transação:', updateError);
      throw updateError;
    }

    console.log('✅ Transação atualizada para aprovado');

    // Se for um depósito, incrementar saldo do usuário usando a função SQL
    if (transaction.type === 'deposit') {
      const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
        p_user_id: transaction.user_id,
        p_amount: transaction.amount
      });

      if (balanceError) {
        console.error('❌ Erro ao incrementar saldo:', balanceError);
        throw balanceError;
      } else {
        console.log(`💰 Saldo incrementado para usuário ${transaction.user_id}: +${transaction.amount}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'PIX payment processed successfully',
        transaction: transaction
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
