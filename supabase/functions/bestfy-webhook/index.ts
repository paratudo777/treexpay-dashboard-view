import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bestfy webhook statuses → internal statuses
const STATUS_MAP: Record<string, string> = {
  PENDING: 'pending',
  PAID: 'approved',
  CANCELED: 'cancelled',
  EXPIRED: 'cancelled',
  REFUNDED: 'refunded',
  UNDER_REVIEW: 'pending',
  REJECTED: 'denied',
  IN_PROTEST: 'pending',
  CHARGEBACK: 'refunded',
  MED: 'refunded',
  UNKNOWN: 'pending',
}

// Duplicate processing prevention
const processedEvents = new Set<string>()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured')
    }

    const body = await req.json()
    console.log('📥 Bestfy webhook received:', JSON.stringify(body))

    const { companyId, transactionId, status, pixEndToEndId, paymentConfirmedAt } = body

    if (!transactionId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing transactionId or status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Idempotency check
    const eventKey = `${transactionId}_${status}`
    if (processedEvents.has(eventKey)) {
      console.log('✅ Event already processed:', eventKey)
      return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const internalStatus = STATUS_MAP[status] || 'pending'
    const isPaid = status === 'PAID'

    console.log(`🔍 Bestfy transaction ${transactionId} → status ${status} → internal ${internalStatus}`)

    // 1. Check deposits — look for bestfy external_id stored in metadata or via api_payments
    // Try api_payments first (API gateway flow)
    const { data: apiPayment } = await supabase
      .from('api_payments')
      .select('*')
      .eq('external_id', transactionId)
      .eq('provider', 'bestfy')
      .maybeSingle()

    if (apiPayment) {
      console.log('📋 Found API payment:', apiPayment.id)

      if (apiPayment.status === 'paid') {
        console.log('✅ API payment already paid')
        processedEvents.add(eventKey)
        return new Response(JSON.stringify({ success: true, message: 'Already paid' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (isPaid) {
        // Update api_payment to paid
        await supabase
          .from('api_payments')
          .update({ status: 'paid', paid_at: paymentConfirmedAt || new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', apiPayment.id)

        // Update corresponding transaction
        const txCode = `API-${apiPayment.id}`
        const { data: userSettings } = await supabase
          .from('settings')
          .select('deposit_fee')
          .eq('user_id', apiPayment.user_id)
          .maybeSingle()

        const feePercent = userSettings?.deposit_fee || 11.99
        const providerFee = 1.50
        const percentageFee = (apiPayment.amount * feePercent) / 100
        const netAmount = apiPayment.amount - percentageFee - providerFee

        await supabase
          .from('transactions')
          .update({ status: 'approved', amount: netAmount, updated_at: new Date().toISOString() })
          .eq('code', txCode)

        await supabase.rpc('incrementar_saldo_usuario', { p_user_id: apiPayment.user_id, p_amount: netAmount })
        console.log('✅ API payment processed, balance updated:', netAmount)
      } else {
        await supabase
          .from('api_payments')
          .update({ status: internalStatus === 'approved' ? 'paid' : internalStatus, updated_at: new Date().toISOString() })
          .eq('id', apiPayment.id)
      }

      processedEvents.add(eventKey)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Check deposits — bestfy stores financialTransactionId, we look for it in deposit metadata
    // The deposit flow stores the external_id in qr_code field or we search by metadata pattern
    // For deposits created via bestfy, the externalRef in metadata contains payment_id which maps to deposit.id
    // Let's try to find a deposit whose pending transaction has matching bestfy external_id

    // Search through transactions that might have bestfy reference in description
    // For now, handle via checkout_payments too

    // 3. Check checkout_payments
    const { data: checkoutPayment } = await supabase
      .from('checkout_payments')
      .select('*, checkouts!checkout_payments_checkout_id_fkey(user_id)')
      .filter('pix_data->>financialTransactionId', 'eq', transactionId)
      .maybeSingle()

    if (checkoutPayment) {
      console.log('📋 Found checkout payment:', checkoutPayment.id)
      const checkoutUserId = (checkoutPayment as any).checkouts?.user_id

      if (checkoutPayment.status === 'paid') {
        processedEvents.add(eventKey)
        return new Response(JSON.stringify({ success: true, message: 'Already paid' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (isPaid && checkoutUserId) {
        await supabase
          .from('checkout_payments')
          .update({ status: 'paid', paid_at: paymentConfirmedAt || new Date().toISOString() })
          .eq('id', checkoutPayment.id)

        // Credit balance
        const netAmount = checkoutPayment.net_amount
        await supabase.rpc('incrementar_saldo_usuario', { p_user_id: checkoutUserId, p_amount: netAmount })

        // Update related transaction
        await supabase
          .from('transactions')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('user_id', checkoutUserId)
          .eq('type', 'payment')
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 86400000).toISOString())
          .like('description', `%${(checkoutPayment as any).customer_name || ''}%`)

        console.log('✅ Checkout payment processed, balance updated:', netAmount)
      }

      processedEvents.add(eventKey)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Check deposits by looking at metadata stored in qr_code or deposit reference
    // Bestfy deposits store the financialTransactionId - search deposits with bestfy provider
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(50)

    if (deposits) {
      for (const deposit of deposits) {
        // Check if this deposit's qr_code contains bestfy reference
        if (deposit.qr_code && deposit.qr_code.includes(transactionId)) {
          console.log('📋 Found deposit by qr_code match:', deposit.id)

          if (isPaid) {
            // Get user fees
            const { data: userSettings } = await supabase
              .from('settings')
              .select('deposit_fee')
              .eq('user_id', deposit.user_id)
              .maybeSingle()

            const userFeePercent = userSettings?.deposit_fee || 11.99
            const providerFee = 1.50
            const percentageFee = (deposit.amount * userFeePercent) / 100
            const netAmount = deposit.amount - percentageFee - providerFee

            // Update deposit
            await supabase.from('deposits').update({ status: 'completed' }).eq('id', deposit.id)

            // Update transaction
            await supabase
              .from('transactions')
              .update({
                status: 'approved',
                amount: netAmount,
                description: `Depósito PIX - R$ ${deposit.amount} (Líquido: R$ ${netAmount.toFixed(2)})`,
                updated_at: new Date().toISOString(),
              })
              .eq('deposit_id', deposit.id)
              .eq('status', 'pending')

            // Credit balance
            await supabase.rpc('incrementar_saldo_usuario', { p_user_id: deposit.user_id, p_amount: netAmount })
            console.log('✅ Deposit processed via Bestfy, balance updated:', netAmount)

            // Send webhook notification to user
            try {
              const { data: webhookConfig } = await supabase
                .from('user_webhooks')
                .select('url, secret')
                .eq('user_id', deposit.user_id)
                .eq('is_active', true)
                .maybeSingle()

              if (webhookConfig?.url) {
                const payload = JSON.stringify({
                  event: 'pix.paid',
                  data: {
                    deposit_id: deposit.id,
                    amount: deposit.amount,
                    net_amount: netAmount,
                    paid_at: paymentConfirmedAt || new Date().toISOString(),
                    provider: 'bestfy',
                  },
                })
                const headers: Record<string, string> = { 'Content-Type': 'application/json' }
                if (webhookConfig.secret) {
                  const encoder = new TextEncoder()
                  const key = await crypto.subtle.importKey('raw', encoder.encode(webhookConfig.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
                  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
                  headers['X-Treex-Signature'] = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
                }
                fetch(webhookConfig.url, { method: 'POST', headers, body: payload }).catch(e => console.error('Webhook send error:', e))
              }
            } catch (e) {
              console.error('Webhook notification error:', e)
            }
          }

          processedEvents.add(eventKey)
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // If we get here, the transaction wasn't found in our system
    console.log('⚠️ Bestfy transaction not found in system:', transactionId)
    processedEvents.add(eventKey)

    // Clean up old events
    if (processedEvents.size > 1000) {
      const arr = Array.from(processedEvents)
      processedEvents.clear()
      arr.slice(-500).forEach(e => processedEvents.add(e))
    }

    return new Response(JSON.stringify({ success: true, message: 'Transaction not matched' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('❌ Bestfy webhook error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
