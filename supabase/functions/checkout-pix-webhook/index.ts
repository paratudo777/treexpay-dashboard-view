
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

    console.log('Webhook recebido:', body);

    const isApproved = body?.status === "approved" || 
                      body?.transaction?.status === "approved" || 
                      body?.payment?.status === "approved" ||
                      body?.status === "Compra Aprovada" ||
                      body?.data?.status === "paid";

    if (!isApproved) {
      console.log('Pagamento não aprovado, ignorando webhook');
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

    console.log('Referência da transação:', transactionRef);

    // Verificar se é pagamento de checkout
    if (!transactionRef.startsWith('checkout_')) {
      console.log('Não é um pagamento de checkout, ignorando');
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

    // Atualizar a transação pendente para aprovada
    const { error: updateTransactionError } = await supabase
      .from('transactions')
      .update({ 
        status: 'approved',
        description: `Venda Checkout: ${payment.checkouts.title} - Cliente: ${payment.customer_name || 'Anônimo'} (PAGO)`,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', payment.checkouts.user_id)
      .eq('type', 'payment')
      .eq('amount', payment.net_amount)
      .eq('status', 'pending')
      .like('description', `%${payment.checkouts.title}%`);

    if (updateTransactionError) {
      console.error('Erro ao atualizar transação:', updateTransactionError);
      // Continua o processo mesmo com erro na transação
    } else {
      console.log('Transação atualizada para aprovada');
    }

    // Creditar valor líquido na conta do dono do checkout
    const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
      p_user_id: payment.checkouts.user_id,
      p_amount: payment.net_amount
    });

    if (balanceError) {
      throw balanceError;
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
