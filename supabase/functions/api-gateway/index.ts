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

// ── Autenticação por API Key ──
async function authenticateApiKey(req: Request): Promise<{ user_id: string; api_key_id: string } | Response> {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (!apiKey || apiKey.length < 16 || !/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
    return json({ error: 'Missing or invalid API key' }, 401)
  }

  const prefix = apiKey.substring(0, 16)
  const admin = getAdmin()

  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id, key_hash, status')
    .eq('key_prefix', prefix)
    .single()

  if (error || !data || data.status !== 'active') {
    return json({ error: 'Invalid or inactive API key' }, 403)
  }

  // Verify hash
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey))
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')

  if (hex !== data.key_hash) {
    return json({ error: 'Invalid API key' }, 403)
  }

  // Update last_used_at (fire and forget)
  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then()

  return { user_id: data.user_id, api_key_id: data.id }
}

// ── Webhook dispatcher ──
async function sendWebhook(url: string, payload: Record<string, unknown>) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.error('Webhook delivery failed:', e)
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

    // ── Autenticação obrigatória para todos os outros endpoints ──
    const auth = await authenticateApiKey(req)
    if (auth instanceof Response) return auth
    const { user_id, api_key_id } = auth

    // ── POST /payments — Criar pagamento ──
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
          api_key_id,
          user_id,
          amount,
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
        webhook_url: payment.webhook_url ? '(configured)' : null,
      }, 201)
    }

    // ── GET /payments — Listar pagamentos ──
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

    // ── GET /payments/:id — Consultar pagamento ──
    const paymentMatch = path.match(/^\/payments\/([a-f0-9-]{36})$/)
    if (paymentMatch && req.method === 'GET') {
      const paymentId = paymentMatch[1]

      const { data, error } = await admin
        .from('api_payments')
        .select('id, amount, status, description, customer_email, metadata, webhook_url, webhook_sent, created_at, updated_at, paid_at')
        .eq('id', paymentId)
        .eq('api_key_id', api_key_id)
        .single()

      if (error || !data) return json({ error: 'Payment not found' }, 404)

      return json(data)
    }

    // ── PATCH /payments/:id/status — Atualizar status (admin/manual) ──
    const statusMatch = path.match(/^\/payments\/([a-f0-9-]{36})\/status$/)
    if (statusMatch && (req.method === 'PATCH' || req.method === 'PUT')) {
      const paymentId = statusMatch[1]
      const body = await req.json()
      const { status: newStatus } = body

      const validStatuses = ['pending', 'paid', 'canceled', 'expired']
      if (!newStatus || !validStatuses.includes(newStatus)) {
        return json({ error: `status must be one of: ${validStatuses.join(', ')}` }, 400)
      }

      // Verificar que o pagamento pertence a esta API key
      const { data: existing, error: findError } = await admin
        .from('api_payments')
        .select('id, status, webhook_url, webhook_sent')
        .eq('id', paymentId)
        .eq('api_key_id', api_key_id)
        .single()

      if (findError || !existing) return json({ error: 'Payment not found' }, 404)

      const updateData: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'paid' && existing.status !== 'paid') {
        updateData.paid_at = new Date().toISOString()
      }

      const { data: updated, error: updateError } = await admin
        .from('api_payments')
        .update(updateData)
        .eq('id', paymentId)
        .select('id, amount, status, description, customer_email, paid_at, webhook_url, webhook_sent')
        .single()

      if (updateError) return json({ error: 'Failed to update payment' }, 500)

      // Se pagou e tem webhook, disparar
      if (newStatus === 'paid' && updated.webhook_url && !existing.webhook_sent) {
        sendWebhook(updated.webhook_url, {
          event: 'payment.paid',
          payment: {
            id: updated.id,
            amount: updated.amount,
            status: 'paid',
            paid_at: updated.paid_at,
          },
        })

        // Marcar webhook como enviado
        admin.from('api_payments').update({ webhook_sent: true }).eq('id', paymentId).then()

        // Creditar saldo no merchant
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
