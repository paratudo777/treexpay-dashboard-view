
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
    console.log('Webhook recebido da NovaEra:', JSON.stringify(body, null, 2));

    // Verificar se é um pagamento aprovado
    const isApproved = body?.status === "approved" || 
                      body?.transaction?.status === "approved" || 
                      body?.payment?.status === "approved" ||
                      body?.status === "Compra Aprovada";

    if (!isApproved) {
      console.log('Webhook ignorado - não é um pagamento aprovado. Status:', body?.status);
      return new Response("ok", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Buscar referência/ID da transação
    const transactionRef = body?.externalRef || 
                          body?.reference || 
                          body?.transaction_id || 
                          body?.id ||
                          body?.externalId;

    if (!transactionRef) {
      console.error('Referência da transação não encontrada no webhook');
      throw new Error('Transaction reference not found');
    }

    console.log('Processando pagamento aprovado para referência:', transactionRef);

    // Buscar a transação no Supabase pela referência
    const { data: transaction, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('code', transactionRef)
      .eq('status', 'pending')
      .single();

    if (findError) {
      console.error('Erro ao buscar transação:', findError);
      // Tentar buscar por outros campos se não encontrar pelo code
      const { data: altTransaction, error: altError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionRef)
        .eq('status', 'pending')
        .single();

      if (altError) {
        console.error('Transação não encontrada:', altError);
        throw new Error(`Transaction not found for reference: ${transactionRef}`);
      }
      
      // Usar a transação encontrada pelo ID alternativo
      const transaction = altTransaction;
    }

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${transactionRef}`);
    }

    console.log('Transação encontrada:', transaction);

    // Atualizar status da transação para aprovado
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar transação:', updateError);
      throw updateError;
    }

    console.log('Transação atualizada para aprovado:', updatedTransaction);

    // Se for um depósito, atualizar saldo do usuário
    if (transaction.type === 'deposit') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', transaction.user_id)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil do usuário:', profileError);
      } else {
        const newBalance = (profile.balance || 0) + transaction.amount;
        
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', transaction.user_id);

        if (balanceError) {
          console.error('Erro ao atualizar saldo:', balanceError);
        } else {
          console.log(`Saldo atualizado para usuário ${transaction.user_id}: ${newBalance}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transaction updated successfully',
        transaction: updatedTransaction
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no webhook:', error);
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
