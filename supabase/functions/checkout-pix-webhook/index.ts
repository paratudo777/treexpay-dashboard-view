
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

    // Verificar se é pagamento de checkout
    if (!transactionRef.startsWith('checkout_')) {
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

    // Extrair checkout_id do formato: checkout_{id}_{timestamp}
    const checkoutId = transactionRef.split('_')[1];

    // Buscar pagamento de checkout pendente
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
      throw paymentError;
    }

    if (!payment) {
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

    // Verificar se o valor confere
    if (Math.abs(payment.amount - amountInReais) > 0.01) { // tolerância de 1 centavo
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
    const { error: updatePaymentError } = await supabase
      .from('checkout_payments')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      throw updatePaymentError;
    }

    // Buscar e atualizar a transação pendente correspondente
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
      // Continua o processo mesmo com erro na busca da transação
    } else if (transactions && transactions.length > 0) {
      const transaction = transactions[0];
      
      const { error: updateTransactionError } = await supabase
        .from('transactions')
        .update({ 
          status: 'approved',
          description: `Venda Checkout: ${payment.checkouts.title} - Cliente: ${payment.customer_name || 'Anônimo'} (PAGO)`,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateTransactionError) {
        // Continua o processo mesmo com erro na transação
      }
    }

    // Creditar valor líquido na conta do dono do checkout
    const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
      p_user_id: payment.checkouts.user_id,
      p_amount: payment.net_amount
    });

    if (balanceError) {
      throw balanceError;
    }

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
