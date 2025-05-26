
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
                      body?.status === "Compra Aprovada";

    if (!isApproved) {
      return new Response("ok", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const transactionRef = body?.externalRef || 
                          body?.reference || 
                          body?.transaction_id || 
                          body?.id ||
                          body?.externalId;

    if (!transactionRef) {
      throw new Error('Transaction reference not found');
    }

    const { data: transaction, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('code', transactionRef)
      .eq('status', 'pending')
      .single();

    if (findError) {
      const { data: altTransaction, error: altError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionRef)
        .eq('status', 'pending')
        .single();

      if (altError) {
        throw new Error(`Transaction not found for reference: ${transactionRef}`);
      }
      
      const transaction = altTransaction;
    }

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${transactionRef}`);
    }

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
      throw updateError;
    }

    if (transaction.type === 'deposit') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', transaction.user_id)
        .single();

      if (!profileError && profile) {
        const newBalance = (profile.balance || 0) + transaction.amount;
        
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', transaction.user_id);
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
