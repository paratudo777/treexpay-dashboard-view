import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

const getAdmin = () => {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key)
}

// ── Autenticação por API Key (sk_live_...) ──
async function authenticateApiKey(req: Request): Promise<{ user_id: string; api_key_id: string } | Response> {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (!apiKey || apiKey.length < 16) {
    return json({ error: 'Missing or invalid API key' }, 401)
  }

  const admin = getAdmin()

  // Try matching by secret_key directly (new pk/sk system)
  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id, status')
    .eq('secret_key', apiKey)
    .eq('status', 'active')
    .maybeSingle()

  if (data) {
    // Update last_used_at (fire and forget)
    admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then()
    return { user_id: data.user_id, api_key_id: data.id }
  }

  // Fallback: try legacy hash-based auth
  if (/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
    const prefix = apiKey.substring(0, 16)
    const { data: legacy } = await admin
      .from('api_keys')
      .select('id, user_id, key_hash, status')
      .eq('key_prefix', prefix)
      .eq('status', 'active')
      .maybeSingle()

    if (legacy) {
      const encoder = new TextEncoder()
      const hash = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey))
      const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
      if (hex === legacy.key_hash) {
        admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', legacy.id).then()
        return { user_id: legacy.user_id, api_key_id: legacy.id }
      }
    }
  }

  return json({ error: 'Invalid or inactive API key' }, 403)
}

// ── Webhook dispatcher with retry ──
async function dispatchWebhooks(admin: ReturnType<typeof getAdmin>, userId: string, paymentId: string, payment: any) {
  // 1. Send to payment-level webhook_url
  if (payment.webhook_url && !payment.webhook_sent) {
    sendWithRetry(payment.webhook_url, {
      event: 'payment.paid',
      payment: { id: paymentId, amount: payment.amount, status: 'paid', paid_at: payment.paid_at },
    })
    admin.from('api_payments').update({ webhook_sent: true }).eq('id', paymentId).then()
  }

  // 2. Send to user-level webhooks
  const { data: webhooks } = await admin
    .from('user_webhooks')
    .select('url')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (webhooks) {
    for (const wh of webhooks) {
      sendWithRetry(wh.url, {
        event: 'payment.paid',
        payment: { id: paymentId, amount: payment.amount, status: 'paid', paid_at: payment.paid_at },
      })
    }
  }
}

async function sendWithRetry(url: string, payload: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) return
      console.error(`Webhook ${url} returned ${res.status}, retry ${i + 1}/${retries}`)
    } catch (e) {
      console.error(`Webhook ${url} failed, retry ${i + 1}/${retries}:`, e)
    }
    if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)))
  }
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace(/^\/api-gateway\/?/, '/')
    const admin = getAdmin()

    // ── Health (público) ──
    if (path === '/health' || path === '/') {
      return json({
        status: 'ok',
        service: 'TreexPay API Gateway',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      })
    }

    // ── Auth ──
    const auth = await authenticateApiKey(req)
    if (auth instanceof Response) return auth
    const { user_id, api_key_id } = auth

    // ── POST /payments ──
    if (path === '/payments' && req.method === 'POST') {
      const body = await req.json()
      const { amount, description, customer_email, webhook_url, metadata } = body

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return json({ error: 'amount is required and must be a positive number' }, 400)
      }
      if (amount > 100000) {
        return json({ error: 'amount cannot exceed 100000' }, 400)
      }

      const { data: payment, error } = await admin
        .from('api_payments')
        .insert({
          api_key_id, user_id, amount,
          description: description || null,
          customer_email: customer_email || null,
          webhook_url: webhook_url || null,
          metadata: metadata || {},
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        return json({ error: 'Failed to create payment' }, 500)
      }

      return json({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        description: payment.description,
        customer_email: payment.customer_email,
        created_at: payment.created_at,
      }, 201)
    }

    // ── GET /payments ──
    if (path === '/payments' && req.method === 'GET') {
      const status = url.searchParams.get('status')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
      const offset = parseInt(url.searchParams.get('offset') || '0')

      let query = admin
        .from('api_payments')
        .select('id, amount, status, description, customer_email, created_at, paid_at', { count: 'exact' })
        .eq('api_key_id', api_key_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) query = query.eq('status', status)

      const { data, error, count } = await query
      if (error) return json({ error: 'Failed to list payments' }, 500)

      return json({ data, total: count, limit, offset })
    }

    // ── GET /payments/:id ──
    const paymentMatch = path.match(/^\/payments\/([a-f0-9-]{36})$/)
    if (paymentMatch && req.method === 'GET') {
      const { data, error } = await admin
        .from('api_payments')
        .select('id, amount, status, description, customer_email, metadata, webhook_sent, created_at, updated_at, paid_at')
        .eq('id', paymentMatch[1])
        .eq('api_key_id', api_key_id)
        .single()

      if (error || !data) return json({ error: 'Payment not found' }, 404)
      return json(data)
    }

    // ── PATCH /payments/:id/status ──
    const statusMatch = path.match(/^\/payments\/([a-f0-9-]{36})\/status$/)
    if (statusMatch && (req.method === 'PATCH' || req.method === 'PUT')) {
      const paymentId = statusMatch[1]
      const body = await req.json()
      const { status: newStatus } = body

      const validStatuses = ['pending', 'paid', 'canceled', 'expired']
      if (!newStatus || !validStatuses.includes(newStatus)) {
        return json({ error: `status must be one of: ${validStatuses.join(', ')}` }, 400)
      }

      const { data: existing } = await admin
        .from('api_payments')
        .select('id, status, webhook_url, webhook_sent, amount')
        .eq('id', paymentId)
        .eq('api_key_id', api_key_id)
        .single()

      if (!existing) return json({ error: 'Payment not found' }, 404)

      const updateData: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'paid' && existing.status !== 'paid') {
        updateData.paid_at = new Date().toISOString()
      }

      const { data: updated, error } = await admin
        .from('api_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select('id, amount, status, description, customer_email, paid_at, webhook_sent')
        .single()

      if (error) return json({ error: 'Failed to update payment' }, 500)

      // Dispatch webhooks & credit balance when paid
      if (newStatus === 'paid' && existing.status !== 'paid') {
        dispatchWebhooks(admin, user_id, paymentId, { ...updated, webhook_url: existing.webhook_url, webhook_sent: existing.webhook_sent })
        admin.rpc('incrementar_saldo_usuario', { p_user_id: user_id, p_amount: updated.amount }).then()
      }

      return json(updated)
    }

    return json({ error: 'Endpoint not found' }, 404)

  } catch (err) {
    console.error('Gateway error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
