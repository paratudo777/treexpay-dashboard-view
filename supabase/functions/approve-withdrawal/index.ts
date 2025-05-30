
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

    console.log('Processing withdrawal approval for ID:', withdrawalId)

    // Get withdrawal details
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

    // Get user balance
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('balance')
      .eq('id', withdrawal.user_id)
      .single()

    if (profileError || !profile) {
      console.error('User profile not found:', profileError)
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User current balance:', profile.balance)

    // Check if user has sufficient balance
    if (profile.balance < withdrawal.amount) {
      console.error('Insufficient balance for withdrawal')
      return new Response(
        JSON.stringify({ error: 'Insufficient balance for withdrawal' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Start transaction: Update withdrawal status to processed
    const { error: updateWithdrawalError } = await supabaseClient
      .from('withdrawals')
      .update({ 
        status: 'processed',
        request_date: new Date().toISOString()
      })
      .eq('id', withdrawalId)

    if (updateWithdrawalError) {
      console.error('Error updating withdrawal status:', updateWithdrawalError)
      return new Response(
        JSON.stringify({ error: 'Error updating withdrawal status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduct amount from user balance
    const { error: balanceError } = await supabaseClient
      .from('profiles')
      .update({ 
        balance: profile.balance - withdrawal.amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawal.user_id)

    if (balanceError) {
      console.error('Error updating user balance:', balanceError)
      // Rollback withdrawal status
      await supabaseClient
        .from('withdrawals')
        .update({ status: 'requested' })
        .eq('id', withdrawalId)
      
      return new Response(
        JSON.stringify({ error: 'Error updating user balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate transaction code
    const code = 'TXN' + new Date().toISOString().slice(0,10).replace(/-/g,'') + Math.floor(Math.random() * 999999).toString().padStart(6, '0')

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        code,
        user_id: withdrawal.user_id,
        type: 'withdrawal',
        description: `Saque PIX - ${withdrawal.pix_key_type.toUpperCase()}: ${withdrawal.pix_key}`,
        amount: withdrawal.amount,
        status: 'approved'
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      // This is not critical, withdrawal is already processed
    }

    console.log('Withdrawal approved successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Withdrawal approved successfully',
        withdrawal_id: withdrawalId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in approve-withdrawal function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
