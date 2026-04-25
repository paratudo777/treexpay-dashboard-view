import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAID_STATUSES_BESTFY = ['PAID', 'paid', 'APPROVED', 'approved']
const PAID_STATUSES_NOVAERA = ['paid', 'approved', 'PAID', 'APPROVED']
const FAILED_STATUSES = ['REFUSED', 'REJECTED', 'CANCELED', 'CANCELLED', 'EXPIRED', 'refused', 'rejected', 'canceled', 'cancelled', 'expired']

/**
 * Cron job: every 2 minutes, scan ALL pending deposits/checkout_payments
 * (across every user) and confirm them via the acquirer APIs.
 *
 * No auth required — this runs from pg_cron internally.
 * Looks only at records < 24h old to keep the scan small.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const BESTFY_API_KEY = Deno.env.get('BESTFY_API_KEY') || ''
    const NOVAERA_BASE_URL = Deno.env.get('NOVAERA_BASE_URL') || ''
    const NOVAERA_PK = Deno.env.get('NOVAERA_PK') || ''
    const NOVAERA_SK = Deno.env.get('NOVAERA_SK') || ''

    const supabase = createClient(SUPABASE_URL, SRK)

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const stats = { deposits_checked: 0, deposits_paid: 0, checkouts_checked: 0, checkouts_paid: 0, errors: 0 }
    const samples: any[] = []

    // ---------- 1) Pending deposits ----------
    const { data: deposits } = await supabase
      .from('deposits')
      .select('id, user_id, amount, qr_code, status, created_at')
      .eq('status', 'waiting')
      .gte('created_at', since)
      .limit(100)

    for (const d of deposits || []) {
      stats.deposits_checked++
      try {
        let provider: 'bestfy' | 'novaera' | null = null
        let externalId: string | null = null
        if (d.qr_code?.includes('|bestfy:')) {
          provider = 'bestfy'
          externalId = d.qr_code.split('|bestfy:')[1]
        } else if (d.qr_code?.includes('|novaera:')) {
          provider = 'novaera'
          externalId = d.qr_code.split('|novaera:')[1]
        } else {
          continue // legacy, skip
        }

        let providerStatus: string | null = null
        if (provider === 'bestfy') {
          if (!BESTFY_API_KEY) continue
          const r = await fetch(`https://api.bestfy.io/transaction/${externalId}`, {
            headers: { 'x-api-key': BESTFY_API_KEY, 'User-Agent': 'TreexPay-Cron' },
          })
          const j = await r.json().catch(() => ({} as any))
          providerStatus = j?.status || j?.transaction?.status
        } else {
          if (!NOVAERA_BASE_URL || !NOVAERA_PK || !NOVAERA_SK) continue
          const credentials = btoa(`${NOVAERA_SK}:${NOVAERA_PK}`)
          const r = await fetch(`${NOVAERA_BASE_URL.replace(/\/$/, '')}/transactions/${externalId}`, {
            headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
          })
          const j = await r.json().catch(() => ({} as any))
          const tx = j?.data ?? j
          providerStatus = tx?.status || tx?.paymentStatus
        }

        if (!providerStatus) continue

        const isPaid = provider === 'bestfy'
          ? PAID_STATUSES_BESTFY.includes(providerStatus)
          : PAID_STATUSES_NOVAERA.includes(providerStatus)
        const isFailed = FAILED_STATUSES.includes(providerStatus)

        if (isPaid) {
          // Atomic claim: only proceed if still 'waiting'
          const { data: claim } = await supabase
            .from('deposits')
            .update({ status: 'completed' })
            .eq('id', d.id)
            .eq('status', 'waiting')
            .select('id')
          if (!claim?.length) continue // someone else processed it

          const { data: settings } = await supabase
            .from('settings').select('deposit_fee').eq('user_id', d.user_id).maybeSingle()
          const feePercent = settings?.deposit_fee ?? 11.99
          const providerFee = 1.50
          const net = +(Number(d.amount) - (Number(d.amount) * feePercent) / 100 - providerFee).toFixed(2)

          await supabase.from('transactions').update({
            status: 'approved', amount: net,
            description: `Depósito PIX - R$ ${d.amount} (Líquido: R$ ${net.toFixed(2)})`,
            updated_at: new Date().toISOString(),
          }).eq('deposit_id', d.id).eq('status', 'pending')

          await supabase.rpc('incrementar_saldo_usuario', { p_user_id: d.user_id, p_amount: net })

          stats.deposits_paid++
          samples.push({ kind: 'deposit', id: d.id, provider, net })
        } else if (isFailed) {
          await supabase.from('deposits').update({ status: 'expired' }).eq('id', d.id).eq('status', 'waiting')
          await supabase.from('transactions').update({
            status: 'cancelled', updated_at: new Date().toISOString(),
          }).eq('deposit_id', d.id).eq('status', 'pending')
        }
      } catch (e: any) {
        stats.errors++
        console.error('deposit check error', d.id, e?.message)
      }
    }

    // ---------- 2) Pending checkout payments (Bestfy) ----------
    const { data: cps } = await supabase
      .from('checkout_payments')
      .select('id, checkout_id, customer_name, amount, net_amount, status, pix_data, card_data, payment_method, created_at, checkouts!checkout_payments_checkout_id_fkey(user_id)')
      .eq('status', 'pending')
      .gte('created_at', since)
      .limit(100)

    for (const p of cps || []) {
      stats.checkouts_checked++
      try {
        const ftId =
          (p.pix_data as any)?.financialTransactionId ??
          (p.pix_data as any)?.data?.id ??
          (p.pix_data as any)?.id ??
          (p.card_data as any)?.bestfy_transaction_id
        if (!ftId || !BESTFY_API_KEY) continue

        const r = await fetch(`https://api.bestfy.io/transaction/${ftId}`, {
          headers: { 'x-api-key': BESTFY_API_KEY, 'User-Agent': 'TreexPay-Cron' },
        })
        const j = await r.json().catch(() => ({} as any))
        const status = j?.status || j?.transaction?.status
        if (!status) continue
        const userId = (p as any).checkouts?.user_id

        if (PAID_STATUSES_BESTFY.includes(status) && userId) {
          const { data: claim } = await supabase
            .from('checkout_payments')
            .update({ status: 'paid', paid_at: j?.paidAt || new Date().toISOString() })
            .eq('id', p.id)
            .eq('status', 'pending')
            .select('id')
          if (!claim?.length) continue

          await supabase.rpc('incrementar_saldo_usuario', {
            p_user_id: userId, p_amount: Number(p.net_amount),
          })

          await supabase.from('transactions').update({
            status: 'approved', updated_at: new Date().toISOString(),
          }).eq('user_id', userId).eq('status', 'pending')
            .like('description', `%${p.customer_name || ''}%`)

          stats.checkouts_paid++
          samples.push({ kind: 'checkout', id: p.id, net: p.net_amount })
        } else if (FAILED_STATUSES.includes(status)) {
          await supabase.from('checkout_payments').update({ status: 'failed' }).eq('id', p.id).eq('status', 'pending')
        }
      } catch (e: any) {
        stats.errors++
        console.error('checkout check error', p.id, e?.message)
      }
    }

    console.log('cron-verify-payments stats:', stats)
    return new Response(JSON.stringify({ success: true, stats, samples }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('cron-verify-payments fatal:', e?.message)
    return new Response(JSON.stringify({ success: false, error: e?.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
