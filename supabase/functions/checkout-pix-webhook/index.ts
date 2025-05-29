
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

    console.log('Webhook checkout PIX recebido:', JSON.stringify(body, null, 2));

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

    const transactionRef = body?.externalRef || 
                          body?.data?.externalRef ||
                          body?.externalId ||
                          body?.data?.externalId ||
                          body?.reference || 
                          body?.transaction_id || 
                          body?.id ||
                          body?.data?.id;

    if (!transactionRef) {
      console.error('Transaction reference not found in webhook payload');
      throw new Error('Transaction reference not found');
    }

    console.log('Referência da transação encontrada:', transactionRef);

    // Verificar se é pagamento de checkout
    if (!transactionRef.startsWith('checkout_')) {
      console.log('Não é um pagamento de checkout, ignorando:', transactionRef);
      return new Response("Not a checkout payment", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const paidAmount = body?.data?.amount || body?.amount || body?.paidAmount;
    if (!paidAmount) {
      throw new Error('Payment amount not found');
    }

    const amountInReais = paidAmount / 100;

    console.log('Processando webhook PIX Checkout:', {
      transactionRef,
      amountInReais,
      timestamp: new Date().toISOString()
    });

    // Buscar pagamento de checkout pendente usando o externalRef que contém o checkout_id
    const checkoutId = transactionRef.split('_')[1]; // extrair checkout_id do formato: checkout_{id}_{timestamp}
    
    console.log('Buscando checkout payment para checkout_id:', checkoutId);

    const { data: payment, error: paymentError } = await supabase
      .from('checkout_payments')
      .select(`
        *,
        checkouts:checkout_id (
          id,
          user_id,
          title,
          amount
        )
      `)
      .eq('checkout_id', checkoutId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error('Erro ao buscar pagamento:', paymentError);
      throw paymentError;
    }

    if (!payment) {
      console.log('Pagamento de checkout não encontrado para checkout_id:', checkoutId);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Checkout payment not found',
          checkoutId
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Pagamento encontrado:', {
      paymentId: payment.id,
      checkoutId: payment.checkout_id,
      amount: payment.amount,
      status: payment.status
    });

    // Verificar se o valor confere
    if (payment.amount !== amountInReais) {
      console.log('Valor do pagamento não confere:', {
        expected: payment.amount,
        received: amountInReais
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payment amount mismatch',
          expected: payment.amount,
          received: amountInReais
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Atualizar status do pagamento para paid
    console.log('Atualizando status do pagamento para paid');
    const { error: updatePaymentError } = await supabase
      .from('checkout_payments')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('Erro ao atualizar pagamento:', updatePaymentError);
      throw updatePaymentError;
    }

    console.log('Status do pagamento atualizado com sucesso');

    // Buscar e atualizar a transação pendente correspondente
    console.log('Buscando transação pendente para atualizar');
    const { data: transactions, error: findTransactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', payment.checkouts.user_id)
      .eq('type', 'payment')
      .eq('amount', payment.net_amount)
      .eq('status', 'pending')
      .like('description', `%${payment.checkouts.title}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (findTransactionError) {
      console.error('Erro ao buscar transação:', findTransactionError);
      // Continua o processo mesmo com erro na busca da transação
    } else if (transactions && transactions.length > 0) {
      const transaction = transactions[0];
      console.log('Transação encontrada, atualizando para approved:', transaction.id);
      
      const { error: updateTransactionError } = await supabase
        .from('transactions')
        .update({ 
          status: 'approved',
          description: `Venda Checkout: ${payment.checkouts.title} - Cliente: ${payment.customer_name || 'Anônimo'} (PAGO)`,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateTransactionError) {
        console.error('Erro ao atualizar transação:', updateTransactionError);
        // Continua o processo mesmo com erro na transação
      } else {
        console.log('Transação atualizada para approved com sucesso');
      }
    } else {
      console.log('Nenhuma transação pendente encontrada para atualizar');
    }

    // Creditar valor líquido na conta do dono do checkout
    console.log('Creditando valor líquido na conta do vendedor:', {
      userId: payment.checkouts.user_id,
      netAmount: payment.net_amount
    });

    const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
      p_user_id: payment.checkouts.user_id,
      p_amount: payment.net_amount
    });

    if (balanceError) {
      console.error('Erro ao incrementar saldo:', balanceError);
      throw balanceError;
    }

    console.log('Saldo incrementado com sucesso');

    console.log('Pagamento de checkout processado com sucesso:', {
      paymentId: payment.id,
      checkoutTitle: payment.checkouts.title,
      netAmount: payment.net_amount,
      userId: payment.checkouts.user_id,
      transactionRef
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Checkout payment processed successfully',
        paymentId: payment.id,
        transactionRef
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no webhook PIX Checkout:', error);
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
