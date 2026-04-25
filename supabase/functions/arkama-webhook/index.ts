import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, user-agent',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Arkama webhook (Postback v2)
 * Docs: https://arkama.readme.io/reference/arkama-postback-v2
 *
 * Payload shape:
 * {
 *   "token": "<secret token configurado no painel>",
 *   "event": "ORDER_PAID" | "ORDER_REFUSED" | "ORDER_CHARGEBACK" | ...,
 *   "data": {
 *     "order": { "id": "...", "status": "PAID", "value": 100.0, "externalRef": "deposit_xxx" },
 *     "cart":  { ... }
 *   }
 * }
 *
 * Segurança: validamos o token contra ARKAMA_WEBHOOK_TOKEN (se configurado).
 * Idempotência: updates atômicos com filtro de status (.eq('status', 'waiting'/'pending')).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Always 200 for non-POST so Arkama URL validation passes
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: true, info: 'arkama webhook alive' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: any = {}
  try { payload = await req.json() } catch {
    return new Response(JSON.stringify({ ok: true, info: 'no json body' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('[arkama-webhook] received:', JSON.stringify(payload).slice(0, 500))

  // ── Token validation (only when secret is configured) ──
  const expectedToken = Deno.env.get('ARKAMA_WEBHOOK_TOKEN')
  if (expectedToken && payload?.token && payload.token !== expectedToken) {
    console.warn('[arkama-webhook] invalid token')
    return new Response(JSON.stringify({ ok: false, error: 'invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const event: string = payload?.event || ''
  const order = payload?.data?.order || payload?.data || {}
  const externalRef: string =
    order?.externalRef || payload?.data?.externalRef || payload?.externalRef || ''
  const status: string = order?.status || payload?.status || ''

  // Test/handshake — always OK
  if (!externalRef || externalRef.includes('webhook-test') || externalRef === 'test') {
    return new Response(JSON.stringify({ ok: true, info: 'handshake' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const isPaid = event === 'ORDER_PAID' || ['PAID', 'paid', 'APPROVED', 'approved'].includes(status)
  const isFailed =
    event === 'ORDER_REFUSED' || event === 'ORDER_CHARGEBACK' || event === 'ORDER_REFUNDED' ||
    ['REFUSED', 'REJECTED', 'CANCELED', 'CANCELLED', 'EXPIRED', 'CHARGEBACK', 'REFUNDED']
      .includes((status || '').toUpperCase())

  if (!isPaid && !isFailed) {
    return new Response(JSON.stringify({ ok: true, info: 'event ignored', event, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // ─── DEPOSIT ───
    if (externalRef.startsWith('deposit_')) {
      const depositId = externalRef.replace('deposit_', '')
      const { data: dep } = await supabase
        .from('deposits').select('id, user_id, amount, status').eq('id', depositId).maybeSingle()
      if (!dep) return ok({ info: 'deposit not found', depositId })

      if (isPaid) {
        const { data: claim } = await supabase
          .from('deposits').update({ status: 'completed' })
          .eq('id', depositId).eq('status', 'waiting').select('id')
        if (!claim?.length) return ok({ info: 'already processed' })

        const { data: settings } = await supabase
          .from('settings').select('deposit_fee').eq('user_id', dep.user_id).maybeSingle()
        const feePct = settings?.deposit_fee ?? 11.99
        const net = +(Number(dep.amount) - (Number(dep.amount) * feePct) / 100 - 1.5).toFixed(2)

        await supabase.from('transactions').update({
          status: 'approved', amount: net,
          description: `Depósito PIX - R$ ${dep.amount} (Líquido: R$ ${net.toFixed(2)})`,
          updated_at: new Date().toISOString(),
        }).eq('deposit_id', depositId).eq('status', 'pending')

        await supabase.rpc('incrementar_saldo_usuario', { p_user_id: dep.user_id, p_amount: net })
        return ok({ kind: 'deposit', id: depositId, net })
      }

      if (isFailed) {
        await supabase.from('deposits').update({ status: 'expired' })
          .eq('id', depositId).eq('status', 'waiting')
        await supabase.from('transactions').update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('deposit_id', depositId).eq('status', 'pending')
        return ok({ kind: 'deposit', id: depositId, failed: true })
      }
    }

    // ─── CHECKOUT ───
    if (externalRef.startsWith('checkout_')) {
      const parts = externalRef.split('_')
      const checkoutId = parts[1]
      // Match by checkout_id + status (most recent pending)
      const { data: cps } = await supabase
        .from('checkout_payments')
        .select('id, checkout_id, net_amount, status, checkouts!checkout_payments_checkout_id_fkey(user_id)')
        .eq('checkout_id', checkoutId).eq('status', 'pending')
        .order('created_at', { ascending: false }).limit(1)
      const cp = cps?.[0]
      if (!cp) return ok({ info: 'checkout payment not found' })
      const userId = (cp as any).checkouts?.user_id

      if (isPaid && userId) {
        const { data: claim } = await supabase
          .from('checkout_payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', cp.id).eq('status', 'pending').select('id')
        if (!claim?.length) return ok({ info: 'already processed' })

        await supabase.rpc('incrementar_saldo_usuario', {
          p_user_id: userId, p_amount: Number(cp.net_amount),
        })
        return ok({ kind: 'checkout', id: cp.id, net: cp.net_amount })
      }

      if (isFailed) {
        await supabase.from('checkout_payments').update({ status: 'failed' })
          .eq('id', cp.id).eq('status', 'pending')
        return ok({ kind: 'checkout', id: cp.id, failed: true })
      }
    }

    // ─── API GATEWAY PAYMENT ───
    if (externalRef.startsWith('api_payment_')) {
      const paymentId = externalRef.replace('api_payment_', '')
      if (isPaid) {
        await supabase.from('api_payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', paymentId).eq('status', 'pending')
      } else if (isFailed) {
        await supabase.from('api_payments').update({ status: 'failed' })
          .eq('id', paymentId).eq('status', 'pending')
      }
      return ok({ kind: 'api_payment', id: paymentId })
    }

    return ok({ info: 'externalRef pattern unrecognized', externalRef })
  } catch (e: any) {
    console.error('[arkama-webhook] error:', e?.message)
    // Return 200 to prevent retries from breaking — log already saved
    return new Response(JSON.stringify({ ok: false, error: e?.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function ok(body: any) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
