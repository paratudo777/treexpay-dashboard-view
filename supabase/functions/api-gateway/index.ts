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

const unauthorized = () => json({ success: false, message: 'Unauthorized' }, 401)

const buildApiTransactionCode = (paymentId: string) => `API-${paymentId}`

const getAdmin = () => {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key)
}

// ── NovaEra PIX Provider ──
async function createNovaEraPix(amount: number, paymentId: string, webhookUrl?: string) {
  const baseUrl = Deno.env.get('NOVAERA_BASE_URL')
  const pk = Deno.env.get('NOVAERA_PK')
  const sk = Deno.env.get('NOVAERA_SK')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')

  if (!baseUrl || !pk || !sk) {
    throw new Error('NovaEra credentials not configured')
  }

  const credentials = btoa(`${sk}:${pk}`)
  const externalRef = `api_payment_${paymentId}`

  const response = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethod: 'pix',
      amount: Math.round(amount * 100), // centavos
      externalRef,
      postbackUrl: `${supabaseUrl}/functions/v1/api-gateway-webhook`,
      pix: {
        pixKey: 'treex@tecnologia.com.br',
        pixKeyType: 'email',
        expiresInSeconds: 3600,
      },
      items: [
        { title: 'Pagamento via API', quantity: 1, tangible: false, unitPrice: Math.round(amount * 100) }
      ],
      customer: {
        name: 'Cliente API',
        email: 'noreply@treexpay.site',
        phone: '5511999999999',
        document: { type: 'cpf', number: '11144477735' },
      },
      metadata: JSON.stringify({ origin: 'TreexPay API Gateway', payment_id: paymentId }),
      traceable: false,
      notifications: { email: false, sms: false },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('NovaEra error:', errorBody)
    throw new Error(`PIX creation failed: ${response.status}`)
  }

  const data = await response.json()
  console.log('NovaEra PIX created:', JSON.stringify(data))

  return {
    external_id: String(data.data?.id || data.data?.externalId || externalRef),
    pix_code: data.data?.pix?.qrcodeText || data.data?.pix?.qrcode || '',
    qr_code: data.data?.pix?.qrcode || '',
    expires_at: data.data?.pix?.expiresAt || data.data?.pix?.expirationDate || new Date(Date.now() + 3600000).toISOString(),
  }
}

// ── Autenticação por API Key (apenas secret key em x-api-key) ──
async function authenticateApiKey(req: Request): Promise<{ user_id: string; api_key_id: string } | Response> {
  const rawApiKey = req.headers.get('x-api-key')
  const apiKey = rawApiKey?.trim() || ''

  console.log('[api-gateway] auth attempt', JSON.stringify({
    has_x_api_key: rawApiKey !== null,
    has_authorization: req.headers.has('authorization'),
    api_key_prefix: apiKey ? apiKey.slice(0, 12) : null,
  }))

  if (!apiKey || !apiKey.startsWith('sk_live_') || apiKey.length < 24) {
    console.warn('[api-gateway] unauthorized request blocked before processing')
    return unauthorized()
  }

  const admin = getAdmin()

  const { data } = await admin
    .from('api_keys')
    .select('id, user_id, status')
    .eq('secret_key', apiKey)
    .eq('status', 'active')
    .maybeSingle()

  if (data) {
    console.log('[api-gateway] auth success', JSON.stringify({ api_key_id: data.id, user_id: data.user_id }))
    admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then()
    return { user_id: data.user_id, api_key_id: data.id }
  }

  // Fallback: legacy hash-based auth apenas para secret keys antigas válidas
  if (/^sk_live_[a-zA-Z0-9_-]+$/.test(apiKey) && apiKey.length < 200) {
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
        console.log('[api-gateway] legacy auth success', JSON.stringify({ api_key_id: legacy.id, user_id: legacy.user_id }))
        admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', legacy.id).then()
        return { user_id: legacy.user_id, api_key_id: legacy.id }
      }
    }
  }

  console.warn('[api-gateway] unauthorized request with invalid or inactive key')
  return unauthorized()
}

// ── Webhook dispatcher with retry ──
async function dispatchWebhooks(admin: ReturnType<typeof getAdmin>, userId: string, paymentId: string, payment: any) {
  if (payment.webhook_url && !payment.webhook_sent) {
    sendWithRetry(payment.webhook_url, {
      event: 'payment.paid',
      payment: { id: paymentId, amount: payment.amount, status: 'paid', paid_at: payment.paid_at },
    })
    admin.from('api_payments').update({ webhook_sent: true }).eq('id', paymentId).then()
  }

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
        version: '2.0.0',
        features: ['pix'],
        timestamp: new Date().toISOString(),
      })
    }

    // ── Auth ──
    const auth = await authenticateApiKey(req)
    if (auth instanceof Response) return auth
    const { user_id, api_key_id } = auth

    // ── POST /payments — Cria pagamento + PIX real ──
    if (path === '/payments' && req.method === 'POST') {
      const body = await req.json()
      const { amount, description, customer_email, customer_name, customer_document, webhook_url, metadata } = body

      console.log('[api-gateway] creating payment', JSON.stringify({ user_id, api_key_id, amount, has_webhook_url: !!webhook_url }))

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return json({ error: 'amount is required and must be a positive number' }, 400)
      }
      if (amount > 100000) {
        return json({ error: 'amount cannot exceed 100000' }, 400)
      }

      // 1. Criar registro interno (pending)
      const { data: payment, error } = await admin
        .from('api_payments')
        .insert({
          api_key_id, user_id, amount,
          description: description || null,
          customer_email: customer_email || null,
          webhook_url: webhook_url || null,
          metadata: metadata || {},
          status: 'pending',
          provider: 'novaera',
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        return json({ error: 'Failed to create payment' }, 500)
      }

      console.log('[api-gateway] api_payment inserted', JSON.stringify({ payment_id: payment.id, user_id, api_key_id }))

      const transactionCode = buildApiTransactionCode(payment.id)
      const { error: transactionInsertError } = await admin
        .from('transactions')
        .insert({
          code: transactionCode,
          user_id,
          type: 'deposit',
          description: `Pagamento API - R$ ${Number(amount).toFixed(2)} (Aguardando pagamento)`,
          amount,
          status: 'pending',
          transaction_date: payment.created_at,
        })

      if (transactionInsertError) {
        console.error('[api-gateway] transaction mirror insert failed:', transactionInsertError)
        await admin
          .from('api_payments')
          .update({ status: 'failed' })
          .eq('id', payment.id)

        return json({ error: 'Failed to create payment transaction mirror' }, 500)
      }

      // 2. Gerar PIX real via NovaEra
      try {
        const pixData = await createNovaEraPix(amount, payment.id)

        // 3. Atualizar registro com dados do PIX
        await admin
          .from('api_payments')
          .update({
            external_id: pixData.external_id,
            pix_code: pixData.pix_code,
            qr_code: pixData.qr_code,
            expires_at: pixData.expires_at,
          })
          .eq('id', payment.id)

        await admin
          .from('transactions')
          .update({
            description: `Pagamento API - R$ ${Number(amount).toFixed(2)} (PIX gerado)`,
            updated_at: new Date().toISOString(),
          })
          .eq('code', transactionCode)
          .eq('user_id', user_id)

        console.log('[api-gateway] payment fully persisted', JSON.stringify({ payment_id: payment.id, api_key_id, external_id: pixData.external_id }))

        return json({
          id: payment.id,
          external_id: pixData.external_id,
          amount: payment.amount,
          status: 'pending',
          description: payment.description,
          customer_email: payment.customer_email,
          pix_code: pixData.pix_code,
          qr_code: pixData.qr_code,
          expires_at: pixData.expires_at,
          provider: 'novaera',
          created_at: payment.created_at,
        }, 201)

      } catch (pixError) {
        // Se falhar na adquirente, marcar como failed
        console.error('PIX creation failed:', pixError)
        await admin
          .from('api_payments')
          .update({ status: 'failed' })
          .eq('id', payment.id)

        await admin
          .from('transactions')
          .update({
            status: 'denied',
            description: `Pagamento API - R$ ${Number(amount).toFixed(2)} (Falha ao gerar PIX)`,
            updated_at: new Date().toISOString(),
          })
          .eq('code', transactionCode)
          .eq('user_id', user_id)

        return json({
          error: 'Failed to generate PIX payment',
          payment_id: payment.id,
          details: pixError.message,
        }, 502)
      }
    }

    // ── GET /payments ──
    if (path === '/payments' && req.method === 'GET') {
      const status = url.searchParams.get('status')
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
      const offset = parseInt(url.searchParams.get('offset') || '0')

      let query = admin
        .from('api_payments')
        .select('id, external_id, amount, status, description, customer_email, pix_code, qr_code, expires_at, provider, created_at, paid_at', { count: 'exact' })
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
        .select('id, external_id, amount, status, description, customer_email, pix_code, qr_code, expires_at, provider, metadata, webhook_sent, created_at, updated_at, paid_at')
        .eq('id', paymentMatch[1])
        .eq('api_key_id', api_key_id)
        .single()

      if (error || !data) return json({ error: 'Payment not found' }, 404)
      return json(data)
    }

    // ── PATCH /payments/:id/status (manual override, mantido) ──
    const statusMatch = path.match(/^\/payments\/([a-f0-9-]{36})\/status$/)
    if (statusMatch && (req.method === 'PATCH' || req.method === 'PUT')) {
      const paymentId = statusMatch[1]
      const body = await req.json()
      const { status: newStatus } = body

      const validStatuses = ['pending', 'paid', 'canceled', 'expired', 'failed']
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
        .select('id, external_id, amount, status, description, customer_email, pix_code, paid_at, webhook_sent')
        .single()

      if (error) return json({ error: 'Failed to update payment' }, 500)

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
