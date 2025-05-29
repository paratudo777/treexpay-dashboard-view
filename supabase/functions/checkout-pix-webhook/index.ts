
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

    console.log('Processando webhook PIX Checkout:', {
      transactionRef,
      amountInReais,
      timestamp: new Date().toISOString()
    });

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
      .eq('status', 'pending')
      .not('pix_data', 'is', null)
      .single();

    if (paymentError || !payment) {
      console.log('Pagamento de checkout não encontrado:', {
        transactionRef,
        error: paymentError?.message
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Checkout payment not found'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verificar se o valor confere
    if (payment.amount !== amountInReais) {
      console.log('Valor do pagamento não confere:', {
        expected: payment.amount,
        received: amountInReais
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payment amount mismatch'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Atualizar status do pagamento
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

    // Creditar valor líquido na conta do dono do checkout
    const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
      p_user_id: payment.checkouts.user_id,
      p_amount: payment.net_amount
    });

    if (balanceError) {
      throw balanceError;
    }

    // Criar transação de recebimento
    const transactionCode = 'CHK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    const { error: createTransactionError } = await supabase
      .from('transactions')
      .insert({
        code: transactionCode,
        user_id: payment.checkouts.user_id,
        type: 'payment',
        description: `Pagamento recebido: ${payment.checkouts.title} - Cliente: ${payment.customer_name || 'Anônimo'}`,
        amount: payment.net_amount,
        status: 'approved'
      });

    if (createTransactionError) {
      throw createTransactionError;
    }

    console.log('Pagamento de checkout processado com sucesso:', {
      paymentId: payment.id,
      checkoutTitle: payment.checkouts.title,
      netAmount: payment.net_amount,
      userId: payment.checkouts.user_id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Checkout payment processed successfully'
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
