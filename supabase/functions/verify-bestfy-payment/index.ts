import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAID_STATUSES_BESTFY = ['PAID', 'paid', 'APPROVED', 'approved']
const PAID_STATUSES_NOVAERA = ['paid', 'approved', 'PAID', 'APPROVED']
const FAILED_STATUSES = ['REFUSED', 'REJECTED', 'CANCELED', 'CANCELLED', 'EXPIRED', 'refused', 'rejected', 'canceled', 'cancelled', 'expired']

/**
 * Verifies pending payments by polling the acquirer APIs.
 * Covers BOTH Bestfy and NovaEra, for:
 *   - checkout_payments (PIX & Card via Bestfy)
 *   - deposits (PIX via Bestfy or NovaEra)
 *
 * Body: { paymentId?: string, depositId?: string }  -- optional filters
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const BESTFY_API_KEY = Deno.env.get('BESTFY_API_KEY') || ''
    const NOVAERA_BASE_URL = Deno.env.get('NOVAERA_BASE_URL') || ''
    const NOVAERA_PK = Deno.env.get('NOVAERA_PK') || ''
    const NOVAERA_SK = Deno.env.get('NOVAERA_SK') || ''

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
    const depositId: string | undefined = body?.depositId

    const results: any[] = []

    // -------- 1) Verify checkout_payments (PIX/Card – mostly Bestfy) --------
    let cpQuery = supabase
      .from('checkout_payments')
      .select('id, checkout_id, customer_name, amount, net_amount, status, pix_data, card_data, payment_method, checkouts!checkout_payments_checkout_id_fkey(user_id)')
      .eq('status', 'pending')
    if (paymentId) cpQuery = cpQuery.eq('id', paymentId)
    const { data: pendingCheckoutPayments } = await cpQuery.limit(50)

    const ownCheckoutPayments = (pendingCheckoutPayments || []).filter(
      (p: any) => p.checkouts?.user_id === user.id
    )

    for (const p of ownCheckoutPayments) {
      const ftId =
        p.pix_data?.financialTransactionId ??
        p.pix_data?.data?.id ??
        p.pix_data?.id ??
        p.card_data?.bestfy_transaction_id

      if (!ftId || !BESTFY_API_KEY) {
        results.push({ source: 'checkout_payment', id: p.id, skipped: 'no transaction id or no bestfy key' })
        continue
      }

      const resp = await fetch(`https://api.bestfy.io/transaction/${ftId}`, {
        headers: { 'x-api-key': BESTFY_API_KEY, 'User-Agent': 'TreexPay' },
      })
      const txt = await resp.text()
      let data: any = {}
      try { data = JSON.parse(txt) } catch {}
      const status = data?.status || data?.transaction?.status

      if (!status) {
        results.push({ source: 'checkout_payment', id: p.id, ftId, error: `Bestfy returned no status (${resp.status})` })
        continue
      }

      if (PAID_STATUSES_BESTFY.includes(status)) {
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

        results.push({ source: 'checkout_payment', id: p.id, ftId, status, action: 'marked_paid', net_amount: p.net_amount })
      } else if (FAILED_STATUSES.includes(status)) {
        await supabase.from('checkout_payments').update({ status: 'failed' }).eq('id', p.id)
        await supabase
          .from('transactions')
          .update({ status: 'denied', updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 86400000 * 30).toISOString())
          .like('description', `%${p.customer_name || ''}%`)
        results.push({ source: 'checkout_payment', id: p.id, ftId, status, action: 'marked_failed' })
      } else {
        results.push({ source: 'checkout_payment', id: p.id, ftId, status, action: 'still_pending' })
      }
    }

    // -------- 2) Verify deposits (PIX – Bestfy or NovaEra) --------
    let dpQuery = supabase
      .from('deposits')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'waiting')
    if (depositId) dpQuery = dpQuery.eq('id', depositId)
    const { data: pendingDeposits } = await dpQuery.order('created_at', { ascending: false }).limit(50)

    for (const d of pendingDeposits || []) {
      // Detect provider from qr_code (Bestfy stores |bestfy:<id> suffix)
      let provider: 'bestfy' | 'novaera' = 'novaera'
      let externalId: string | null = null

      if (d.qr_code && d.qr_code.includes('|bestfy:')) {
        provider = 'bestfy'
        externalId = d.qr_code.split('|bestfy:')[1]
      } else {
        // NovaEra: externalRef is `deposit_<deposit_id>`. Use NovaEra API to query by externalRef.
        provider = 'novaera'
        externalId = `deposit_${d.id}`
      }

      let providerStatus: string | null = null
      let raw: any = null

      if (provider === 'bestfy') {
        if (!BESTFY_API_KEY) {
          results.push({ source: 'deposit', id: d.id, skipped: 'no bestfy key' })
          continue
        }
        const resp = await fetch(`https://api.bestfy.io/transaction/${externalId}`, {
          headers: { 'x-api-key': BESTFY_API_KEY, 'User-Agent': 'TreexPay' },
        })
        const txt = await resp.text()
        try { raw = JSON.parse(txt) } catch { raw = txt }
        providerStatus = raw?.status || raw?.transaction?.status
        console.log(`Bestfy /transaction/${externalId} → ${resp.status}`, txt.slice(0, 200))
      } else {
        if (!NOVAERA_BASE_URL || !NOVAERA_PK || !NOVAERA_SK) {
          results.push({ source: 'deposit', id: d.id, skipped: 'no novaera credentials' })
          continue
        }
        // Search NovaEra by externalRef
        const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`)
        const url = `${NOVAERA_BASE_URL.replace(/\/$/, '')}/transactions?externalRef=${encodeURIComponent(externalId!)}`
        const resp = await fetch(url, {
          headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
        })
        const txt = await resp.text()
        try { raw = JSON.parse(txt) } catch { raw = txt }
        // NovaEra returns { data: [tx] } or { data: tx } — try both
        const tx = Array.isArray(raw?.data) ? raw.data[0] : raw?.data
        providerStatus = tx?.status || tx?.paymentStatus
        console.log(`NovaEra /transactions?externalRef=${externalId} → ${resp.status} status=${providerStatus}`)
      }

      if (!providerStatus) {
        results.push({ source: 'deposit', id: d.id, provider, externalId, error: 'no status returned' })
        continue
      }

      const isPaid = provider === 'bestfy'
        ? PAID_STATUSES_BESTFY.includes(providerStatus)
        : PAID_STATUSES_NOVAERA.includes(providerStatus)

      const isFailed = FAILED_STATUSES.includes(providerStatus)

      if (isPaid) {
        // compute net & credit
        const { data: settings } = await supabase
          .from('settings')
          .select('deposit_fee')
          .eq('user_id', d.user_id)
          .maybeSingle()
        const feePercent = settings?.deposit_fee ?? 11.99
        const providerFee = 1.50
        const net = +(d.amount - (d.amount * feePercent) / 100 - providerFee).toFixed(2)

        await supabase.from('deposits').update({ status: 'completed' }).eq('id', d.id)

        await supabase
          .from('transactions')
          .update({
            status: 'approved',
            amount: net,
            description: `Depósito PIX - R$ ${d.amount} (Líquido: R$ ${net.toFixed(2)})`,
            updated_at: new Date().toISOString(),
          })
          .eq('deposit_id', d.id)
          .eq('status', 'pending')

        await supabase.rpc('incrementar_saldo_usuario', { p_user_id: d.user_id, p_amount: net })

        results.push({ source: 'deposit', id: d.id, provider, status: providerStatus, action: 'marked_paid', net_amount: net })
      } else if (isFailed) {
        await supabase.from('deposits').update({ status: 'expired' }).eq('id', d.id)
        await supabase
          .from('transactions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('deposit_id', d.id)
          .eq('status', 'pending')
        results.push({ source: 'deposit', id: d.id, provider, status: providerStatus, action: 'marked_failed' })
      } else {
        results.push({ source: 'deposit', id: d.id, provider, status: providerStatus, action: 'still_pending' })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked_checkout_payments: ownCheckoutPayments.length,
        checked_deposits: (pendingDeposits || []).length,
        results,
      }),
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
