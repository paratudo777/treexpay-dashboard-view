
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { withdrawalId } = await req.json()

    if (!withdrawalId) {
      return new Response(
        JSON.stringify({ error: 'Withdrawal ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing withdrawal rejection for ID:', withdrawalId)

    // Check if withdrawal exists and is still pending
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .eq('status', 'requested')
      .single()

    if (withdrawalError || !withdrawal) {
      console.error('Withdrawal not found or already processed:', withdrawalError)
      return new Response(
        JSON.stringify({ error: 'Withdrawal not found or already processed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found withdrawal:', withdrawal)

    // Update withdrawal status to rejected
    const { error: updateError } = await supabaseClient
      .from('withdrawals')
      .update({ 
        status: 'rejected',
        request_date: new Date().toISOString()
      })
      .eq('id', withdrawalId)

    if (updateError) {
      console.error('Error updating withdrawal status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Error updating withdrawal status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Withdrawal rejected successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Withdrawal rejected successfully',
        withdrawal_id: withdrawalId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in reject-withdrawal function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
