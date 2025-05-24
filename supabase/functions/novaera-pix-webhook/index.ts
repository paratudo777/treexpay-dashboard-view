
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
    console.log('Received webhook:', JSON.stringify(body, null, 2));

    // Check if this is an approved PIX payment
    if (!body?.externalId || body?.status !== "approved") {
      console.log('Webhook ignored - not an approved payment');
      return new Response("ok", { headers: corsHeaders });
    }

    const externalRef = body.externalId;
    console.log('Processing approved payment for:', externalRef);

    // Update deposit status to completed
    const { data, error } = await supabase
      .from("deposits")
      .update({ status: "completed" })
      .eq("qr_code", body.pix?.qrcodeText)
      .select();

    if (error) {
      console.error('Error updating deposit:', error);
      throw error;
    }

    console.log('Updated deposits:', data);

    // If deposit was found and updated, also create a transaction record
    if (data && data.length > 0) {
      const deposit = data[0];
      
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: deposit.user_id,
          type: 'deposit',
          amount: deposit.amount,
          status: 'completed',
          description: 'Depósito via PIX',
          code: `DEP_${Date.now()}`
        });

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
      } else {
        console.log('Transaction record created for deposit');
      }
    }

    return new Response("updated", { 
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
