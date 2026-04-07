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

const buildApiTransactionCode = (paymentId: string) => `API-${paymentId}`

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
    // Apply user fee settings
    let netAmount = payment.amount
    const { data: userSettings } = await admin
      .from('settings')
      .select('deposit_fee')
      .eq('user_id', payment.user_id)
      .maybeSingle()

    const feePercent = userSettings?.deposit_fee ?? 11.99
    const providerFee = 1.50
    const percentageFee = (payment.amount * feePercent) / 100
    const totalFees = percentageFee + providerFee
    netAmount = payment.amount - totalFees
    if (netAmount < 0) netAmount = 0

    console.log('💰 Fee calculation:', { amount: payment.amount, feePercent, providerFee, totalFees, netAmount })

    const { error: balanceError } = await admin.rpc('incrementar_saldo_usuario', {
      p_user_id: payment.user_id,
      p_amount: netAmount,
    })

    if (balanceError) {
      console.error('❌ Failed to credit balance:', balanceError)
    } else {
      console.log('💰 Balance credited:', netAmount, 'to user:', payment.user_id)
    }

    // Update visible transaction record for the dashboard
    const txCode = buildApiTransactionCode(paymentId)
    const { data: updatedTransactions, error: txError } = await admin
      .from('transactions')
      .update({
        amount: netAmount,
        status: 'approved',
        description: `Pagamento API - R$ ${payment.amount.toFixed(2)} (Líquido: R$ ${netAmount.toFixed(2)})`,
        transaction_date: paidAt,
        updated_at: paidAt,
      })
      .eq('code', txCode)
      .eq('user_id', payment.user_id)
      .select('id')

    if (txError) {
      console.error('❌ Failed to update transaction record:', txError)
    } else if (!updatedTransactions || updatedTransactions.length === 0) {
      const { error: fallbackTxError } = await admin
      .from('transactions')
      .insert({
        code: txCode,
        user_id: payment.user_id,
        type: 'deposit',
        description: `Pagamento API - R$ ${payment.amount.toFixed(2)} (Líquido: R$ ${netAmount.toFixed(2)})`,
        amount: netAmount,
        status: 'approved',
        transaction_date: paidAt,
      })

      if (fallbackTxError) {
        console.error('❌ Failed to create fallback transaction record:', fallbackTxError)
      } else {
        console.log('✅ Fallback transaction record created:', txCode)
      }
    } else {
      console.log('✅ Transaction record updated:', txCode)
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
