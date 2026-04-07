import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

// Prevent duplicate processing in same instance
const processedRefs = new Set<string>()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.json()
    console.log('📥 API Gateway Webhook received:', JSON.stringify(body))

    // Extract external reference
    const externalRef: string = body?.externalRef || body?.data?.externalRef || body?.externalId || body?.data?.externalId || ''

    if (!externalRef || !externalRef.startsWith('api_payment_')) {
      console.log('⏭️ Not an API payment webhook, ignoring:', externalRef)
      return json({ success: true, message: 'Ignored - not an API payment' })
    }

    // Duplicate check
    if (processedRefs.has(externalRef)) {
      console.log('✅ Already processed:', externalRef)
      return json({ success: true, message: 'Already processed' })
    }

    // Check if payment is approved
    const isApproved =
      body?.status === 'approved' ||
      body?.transaction?.status === 'approved' ||
      body?.payment?.status === 'approved' ||
      body?.status === 'Compra Aprovada' ||
      body?.data?.status === 'paid'

    if (!isApproved) {
      console.log('⏳ Payment not approved yet, status:', body?.status || body?.data?.status)
      return json({ success: true, message: 'Not approved yet' })
    }

    // Mark as processed
    processedRefs.add(externalRef)
    if (processedRefs.size > 1000) {
      const arr = Array.from(processedRefs)
      processedRefs.clear()
      arr.slice(-500).forEach(r => processedRefs.add(r))
    }

    const paymentId = externalRef.replace('api_payment_', '')
    console.log('🔍 Processing payment:', paymentId)

    // Find payment
    const { data: payment, error: findError } = await admin
      .from('api_payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (findError || !payment) {
      console.error('❌ Payment not found:', paymentId, findError)
      return json({ error: 'Payment not found' }, 404)
    }

    // Already paid? Skip
    if (payment.status === 'paid') {
      console.log('✅ Payment already paid:', paymentId)
      return json({ success: true, message: 'Already paid' })
    }

    const paidAt = new Date().toISOString()

    // Update payment to paid
    const { error: updateError } = await admin
      .from('api_payments')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', paymentId)

    if (updateError) {
      console.error('❌ Failed to update payment:', updateError)
      throw updateError
    }

    console.log('✅ Payment marked as paid:', paymentId)

    // Credit user balance
    const { error: balanceError } = await admin.rpc('incrementar_saldo_usuario', {
      p_user_id: payment.user_id,
      p_amount: payment.amount,
    })

    if (balanceError) {
      console.error('❌ Failed to credit balance:', balanceError)
    } else {
      console.log('💰 Balance credited:', payment.amount, 'to user:', payment.user_id)
    }

    // Dispatch webhooks to client
    // 1. Payment-level webhook
    if (payment.webhook_url && !payment.webhook_sent) {
      const webhookPayload = {
        event: 'payment.paid',
        payment: {
          id: paymentId,
          amount: payment.amount,
          status: 'paid',
          paid_at: paidAt,
        },
      }

      fetch(payment.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      }).then(res => {
        console.log(`✅ Client webhook sent to ${payment.webhook_url}: ${res.status}`)
      }).catch(err => {
        console.error(`❌ Client webhook failed:`, err.message)
      })

      admin.from('api_payments').update({ webhook_sent: true }).eq('id', paymentId).then()
    }

    // 2. User-level webhooks
    const { data: userWebhooks } = await admin
      .from('user_webhooks')
      .select('url, secret')
      .eq('user_id', payment.user_id)
      .eq('is_active', true)

    if (userWebhooks) {
      const payload = {
        event: 'payment.paid',
        payment: { id: paymentId, amount: payment.amount, status: 'paid', paid_at: paidAt },
      }
      for (const wh of userWebhooks) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        const payloadStr = JSON.stringify(payload)

        if (wh.secret) {
          try {
            const encoder = new TextEncoder()
            const key = await crypto.subtle.importKey('raw', encoder.encode(wh.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
            const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr))
            headers['X-Treex-Signature'] = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
          } catch (_) { /* ignore signing errors */ }
        }

        fetch(wh.url, { method: 'POST', headers, body: payloadStr }).then(res => {
          console.log(`✅ User webhook sent to ${wh.url}: ${res.status}`)
        }).catch(err => {
          console.error(`❌ User webhook failed:`, err.message)
        })
      }
    }

    return json({
      success: true,
      message: 'Payment processed successfully',
      payment_id: paymentId,
      amount: payment.amount,
      paid_at: paidAt,
    })

  } catch (err) {
    console.error('❌ Webhook error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
