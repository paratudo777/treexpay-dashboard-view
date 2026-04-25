import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Admin-only manual approval of a pending deposit.
 * Body: { depositId: string }
 * - Marks the deposit as completed
 * - Updates linked pending transaction to approved (with computed net_amount)
 * - Credits the user's balance
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SRK)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin guard
    const { data: prof } = await supabase.from('profiles').select('profile').eq('id', user.id).single()
    if (prof?.profile !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { depositId, transactionId } = await req.json().catch(() => ({}))

    let depositRowId = depositId as string | undefined

    // Allow approving by transactionId for non-deposit txs (api/checkout pendings)
    if (!depositRowId && transactionId) {
      const { data: tx } = await supabase
        .from('transactions')
        .select('id, user_id, amount, status, deposit_id, type')
        .eq('id', transactionId)
        .single()
      if (!tx) {
        return new Response(JSON.stringify({ error: 'Transaction not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (tx.status !== 'pending') {
        return new Response(JSON.stringify({ error: `Transaction is already ${tx.status}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (tx.deposit_id) {
        depositRowId = tx.deposit_id
      } else {
        // No deposit row — directly approve & credit
        await supabase.from('transactions').update({
          status: 'approved',
          updated_at: new Date().toISOString(),
        }).eq('id', tx.id)
        await supabase.rpc('incrementar_saldo_usuario', {
          p_user_id: tx.user_id, p_amount: Number(tx.amount),
        })
        return new Response(JSON.stringify({
          success: true, message: 'Transaction approved and balance credited',
          transactionId: tx.id, credited: Number(tx.amount),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    if (!depositRowId) {
      return new Response(JSON.stringify({ error: 'depositId or transactionId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: deposit, error: depErr } = await supabase
      .from('deposits').select('*').eq('id', depositRowId).single()
    if (depErr || !deposit) {
      return new Response(JSON.stringify({ error: 'Deposit not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (deposit.status === 'completed') {
      return new Response(JSON.stringify({ success: true, message: 'Already completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fees
    const { data: settings } = await supabase
      .from('settings').select('deposit_fee').eq('user_id', deposit.user_id).maybeSingle()
    const feePercent = settings?.deposit_fee ?? 11.99
    const providerFee = 1.50
    const net = +(Number(deposit.amount) - (Number(deposit.amount) * feePercent) / 100 - providerFee).toFixed(2)

    // Update deposit
    await supabase.from('deposits').update({ status: 'completed' }).eq('id', deposit.id)

    // Update transaction
    await supabase.from('transactions').update({
      status: 'approved',
      amount: net,
      description: `Depósito PIX - R$ ${deposit.amount} (Líquido: R$ ${net.toFixed(2)}) [Aprovado manualmente]`,
      updated_at: new Date().toISOString(),
    }).eq('deposit_id', deposit.id).eq('status', 'pending')

    // Credit balance
    await supabase.rpc('incrementar_saldo_usuario', {
      p_user_id: deposit.user_id, p_amount: net,
    })

    return new Response(JSON.stringify({
      success: true, message: 'Deposit approved manually',
      depositId: deposit.id, credited: net,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
