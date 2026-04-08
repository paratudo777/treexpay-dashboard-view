import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createPixWithFallback, getAvailableProviderNames } from '../_shared/payment-providers/registry.ts'

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

// ── Rate limiting (in-memory per instance) ──
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

// ── Idempotency (in-memory per instance) ──
const idempotencyCache = new Map<string, { response: unknown; status: number; timestamp: number }>()

function getIdempotentResponse(key: string): { response: unknown; status: number } | null {
  const entry = idempotencyCache.get(key)
  if (!entry) return null
  // Expire after 24h
  if (Date.now() - entry.timestamp > 86400000) {
    idempotencyCache.delete(key)
    return null
  }
  return { response: entry.response, status: entry.status }
}

function setIdempotentResponse(key: string, response: unknown, status: number) {
  idempotencyCache.set(key, { response, status, timestamp: Date.now() })
  // Cleanup old entries
  if (idempotencyCache.size > 5000) {
    const now = Date.now()
    for (const [k, v] of idempotencyCache) {
      if (now - v.timestamp > 86400000) idempotencyCache.delete(k)
    }
  }
}

// ── Autenticação por API Key (apenas secret key em x-api-key) ──
async function authenticateApiKey(req: Request): Promise<{ user_id: string; api_key_id: string } | Response> {
  const rawApiKey = req.headers.get('x-api-key')
  const apiKey = rawApiKey?.trim() || ''

  // CRITICAL: Block anything that isn't a valid sk_live_ key
  if (!apiKey || !apiKey.startsWith('sk_live_') || apiKey.length < 24) {
    console.warn('[api-gateway] BLOCKED: missing or invalid x-api-key')
    return unauthorized()
  }

  // CRITICAL: Explicitly ignore Authorization header — JWT must never bypass API key auth
  const admin = getAdmin()

  // Direct match on secret_key column
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

  // Fallback: legacy hash-based auth for older sk_live_ keys
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
        console.log('[api-gateway] legacy auth success')
        admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', legacy.id).then()
        return { user_id: legacy.user_id, api_key_id: legacy.id }
      }
    }
  }

  console.warn('[api-gateway] BLOCKED: invalid or inactive key')
  return unauthorized()
}

// ── Webhook dispatcher with retry + HMAC signing ──
async function dispatchWebhooks(admin: ReturnType<typeof getAdmin>, userId: string, paymentId: string, payment: any) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Payment-level webhook (direct URL from create request)
  if (payment.webhook_url && !payment.webhook_sent) {
    sendWithRetry(payment.webhook_url, {
      event: 'payment.paid',
      payment: { id: paymentId, amount: payment.amount, status: 'paid', paid_at: payment.paid_at },
    })
    admin.from('api_payments').update({ webhook_sent: true }).eq('id', paymentId).then()
  }

  // 2. Dispatch via centralized webhook system (events filter, retry, logs, HMAC)
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/dispatch-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        event: 'payment.paid',
        payload: {
          payment: { id: paymentId, amount: payment.amount, status: 'paid', paid_at: payment.paid_at },
        },
      }),
    })
  } catch (e) {
    console.error('[api-gateway] dispatch-webhook call failed:', e)
  }
}

async function sendWithRetry(url: string, payload: any, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeout)
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
    const clientIP = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'

    // ── Rate limit by IP ──
    if (!checkRateLimit(`ip_${clientIP}`)) {
      return json({ error: 'Rate limit exceeded. Try again later.' }, 429)
    }

    const admin = getAdmin()

    // ── Health (público) ──
    if (path === '/health' || path === '/') {
      return json({
        status: 'ok',
        service: 'TreexPay API Gateway',
        version: '3.0.0',
        providers: getAvailableProviderNames(),
        features: ['pix', 'multi-provider', 'fallback', 'idempotency'],
        timestamp: new Date().toISOString(),
      })
    }

    // ── Auth (CRITICAL — blocks everything without valid sk_live_) ──
    const auth = await authenticateApiKey(req)
    if (auth instanceof Response) return auth
    const { user_id, api_key_id } = auth

    // Rate limit per API key
    if (!checkRateLimit(`key_${api_key_id}`, 60, 60000)) {
      return json({ error: 'Rate limit exceeded for this API key.' }, 429)
    }

    // ── POST /payments — Cria pagamento + PIX via provider registry ──
    if (path === '/payments' && req.method === 'POST') {
      // Idempotency check
      const idempotencyKey = req.headers.get('Idempotency-Key')
      if (idempotencyKey) {
        const cached = getIdempotentResponse(`${api_key_id}_${idempotencyKey}`)
        if (cached) {
          console.log('[api-gateway] idempotent cache hit')
          return json(cached.response, cached.status)
        }
      }

      const body = await req.json()
      const { amount, description, customer_email, customer_name, customer_document, webhook_url, metadata } = body

      // Validation
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return json({ error: 'amount is required and must be a positive number' }, 400)
      }
      if (amount > 100000) {
        return json({ error: 'amount cannot exceed 100000' }, 400)
      }

      // 1. Create internal record (pending)
      const { data: payment, error } = await admin
        .from('api_payments')
        .insert({
          api_key_id, user_id, amount,
          description: description || null,
          customer_email: customer_email || null,
          webhook_url: webhook_url || null,
          metadata: metadata || {},
          status: 'pending',
          provider: 'pending', // will be updated with actual provider
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        return json({ error: 'Failed to create payment' }, 500)
      }

      // 2. Create transaction mirror for dashboard
      const transactionCode = buildApiTransactionCode(payment.id)
      const { error: txInsertError } = await admin
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

      if (txInsertError) {
        console.error('[api-gateway] transaction mirror insert failed:', txInsertError)
        await admin.from('api_payments').update({ status: 'failed' }).eq('id', payment.id)
        return json({ error: 'Failed to create payment transaction mirror' }, 500)
      }

      // 3. Generate PIX via provider registry (with automatic fallback)
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      try {
        const pixResult = await createPixWithFallback({
          amount,
          paymentId: payment.id,
          webhookUrl: `${supabaseUrl}/functions/v1/api-gateway-webhook`,
          description: description || undefined,
          customer: {
            name: customer_name || undefined,
            email: customer_email || undefined,
            document: customer_document || undefined,
          },
          metadata: metadata || undefined,
        })

        // 4. Update record with PIX data + actual provider used
        await admin
          .from('api_payments')
          .update({
            external_id: pixResult.external_id,
            pix_code: pixResult.pix_code,
            qr_code: pixResult.qr_code,
            expires_at: pixResult.expires_at,
            provider: pixResult.provider,
          })
          .eq('id', payment.id)

        await admin
          .from('transactions')
          .update({
            description: `Pagamento API - R$ ${Number(amount).toFixed(2)} (PIX gerado via ${pixResult.provider})`,
            updated_at: new Date().toISOString(),
          })
          .eq('code', transactionCode)
          .eq('user_id', user_id)

        // Dispatch pix.generated webhook
        try {
          await fetch(`${supabaseUrl}/functions/v1/dispatch-webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
            },
            body: JSON.stringify({
              user_id,
              event: 'pix.generated',
              payload: {
                payment: { id: payment.id, amount, status: 'pending', pix_code: pixResult.pix_code, provider: pixResult.provider },
              },
            }),
          })
        } catch (_) { /* non-critical */ }

        const responseBody = {
          id: payment.id,
          external_id: pixResult.external_id,
          amount: payment.amount,
          status: 'pending',
          description: payment.description,
          customer_email: payment.customer_email,
          pix_code: pixResult.pix_code,
          qr_code: pixResult.qr_code,
          expires_at: pixResult.expires_at,
          provider: pixResult.provider,
          created_at: payment.created_at,
        }

        // Cache idempotent response
        if (idempotencyKey) {
          setIdempotentResponse(`${api_key_id}_${idempotencyKey}`, responseBody, 201)
        }

        return json(responseBody, 201)

      } catch (pixError) {
        const pixErrorMessage = pixError instanceof Error ? pixError.message : 'Unknown PIX creation error'
        console.error('PIX creation failed (all providers):', pixError)

        await admin.from('api_payments').update({ status: 'failed' }).eq('id', payment.id)
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
          details: pixErrorMessage,
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

    // ── PATCH /payments/:id/status ──
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
        .select('id, status, webhook_url, webhook_sent, amount, user_id')
        .eq('id', paymentId)
        .eq('api_key_id', api_key_id)
        .single()

      if (!existing) return json({ error: 'Payment not found' }, 404)

      // Multi-tenant check: ensure payment belongs to authenticated user
      if (existing.user_id !== user_id) {
        return json({ error: 'Payment not found' }, 404)
      }

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
