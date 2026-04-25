import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAID_STATUSES = ['PAID', 'paid', 'APPROVED', 'approved']

/**
 * Verifies pending Bestfy payments by polling the Bestfy API
 * and updates checkout_payments / transactions / balance accordingly.
 *
 * Body: { paymentId?: string }  -- if omitted, verifies all pending Bestfy payments for the caller
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const BESTFY_API_KEY = Deno.env.get('BESTFY_API_KEY')!

    if (!BESTFY_API_KEY) throw new Error('BESTFY_API_KEY not configured')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Authenticate caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const paymentId: string | undefined = body?.paymentId

    // Fetch user's pending Bestfy checkout_payments (only owner of the checkout)
    let query = supabase
      .from('checkout_payments')
      .select('id, checkout_id, customer_name, amount, net_amount, status, pix_data, checkouts!checkout_payments_checkout_id_fkey(user_id)')
      .eq('status', 'pending')

    if (paymentId) query = query.eq('id', paymentId)

    const { data: pending, error } = await query.limit(50)
    if (error) throw error

    const ownPending = (pending || []).filter((p: any) => p.checkouts?.user_id === user.id)
    console.log(`🔎 Verifying ${ownPending.length} pending payments for user ${user.id}`)

    const results: any[] = []

    for (const p of ownPending) {
      const ftId =
        p.pix_data?.financialTransactionId ??
        p.pix_data?.data?.id ??
        p.pix_data?.id

      if (!ftId) {
        results.push({ id: p.id, skipped: 'no transaction id' })
        continue
      }

      // Query Bestfy
      const resp = await fetch(`https://api.bestfy.io/transaction/${ftId}`, {
        headers: { 'x-api-key': BESTFY_API_KEY, 'User-Agent': 'TreexPay' },
      })
      const txt = await resp.text()
      let data: any = {}
      try { data = JSON.parse(txt) } catch {}
      console.log(`Bestfy /transaction/${ftId} → ${resp.status}`, txt.slice(0, 300))

      const status = data?.status || data?.transaction?.status
      if (!status) {
        results.push({ id: p.id, ftId, error: `Bestfy returned no status (${resp.status})` })
        continue
      }

      if (PAID_STATUSES.includes(status)) {
        // Mark as paid + credit balance
        await supabase
          .from('checkout_payments')
          .update({ status: 'paid', paid_at: data.paidAt || new Date().toISOString() })
          .eq('id', p.id)

        await supabase.rpc('incrementar_saldo_usuario', {
          p_user_id: user.id, p_amount: p.net_amount,
        })

        await supabase
          .from('transactions')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 86400000 * 30).toISOString())
          .like('description', `%${p.customer_name || ''}%`)

        results.push({ id: p.id, ftId, status, action: 'marked_paid', net_amount: p.net_amount })
      } else if (['REFUSED', 'REJECTED', 'CANCELED', 'CANCELLED', 'EXPIRED'].includes(status)) {
        await supabase.from('checkout_payments').update({ status: 'failed' }).eq('id', p.id)
        await supabase
          .from('transactions')
          .update({ status: 'denied', updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 86400000 * 30).toISOString())
          .like('description', `%${p.customer_name || ''}%`)
        results.push({ id: p.id, ftId, status, action: 'marked_failed' })
      } else {
        results.push({ id: p.id, ftId, status, action: 'still_pending' })
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: ownPending.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('verify-bestfy-payment error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
