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
  CANCELLED: 'cancelled',
  EXPIRED: 'cancelled',
  REFUNDED: 'refunded',
  UNDER_REVIEW: 'pending',
  REJECTED: 'denied',
  REFUSED: 'denied',
  IN_PROTEST: 'pending',
  CHARGEBACK: 'refunded',
  MED: 'refunded',
  UNKNOWN: 'pending',
  // lowercase versions
  pending: 'pending',
  paid: 'approved',
  approved: 'approved',
  refused: 'denied',
  refunded: 'refunded',
  chargeback: 'refunded',
  cancelled: 'cancelled',
  expired: 'cancelled',
}

const PAID_STATUSES = ['PAID', 'paid', 'APPROVED', 'approved']

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

    const rawBody = await req.text()
    console.log('📥 Bestfy webhook RAW:', rawBody)

    let body: any = {}
    try { body = JSON.parse(rawBody) } catch { body = {} }

    // Bestfy may send fields in multiple shapes – normalize:
    const transactionId = String(
      body.transactionId ??
      body.financialTransactionId ??
      body.id ??
      body.transaction?.id ??
      body.transaction?.financialTransactionId ??
      body.data?.id ??
      body.data?.transactionId ??
      body.data?.financialTransactionId ??
      ''
    ).trim()

    const status = String(
      body.status ??
      body.transaction?.status ??
      body.data?.status ??
      ''
    ).trim()

    const paymentConfirmedAt =
      body.paymentConfirmedAt ??
      body.transaction?.paidAt ??
      body.data?.paidAt ??
      body.paidAt

    console.log(`🔧 Normalized: transactionId=${transactionId} status=${status}`)

    if (!transactionId || !status) {
      console.warn('⚠️ Missing transactionId or status, returning 200 to avoid retries')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing transactionId or status', received: body }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const internalStatus = STATUS_MAP[status] || STATUS_MAP[status.toUpperCase()] || 'pending'
    const isPaid = PAID_STATUSES.includes(status)

    console.log(`🔍 Bestfy transaction ${transactionId} → status ${status} → internal ${internalStatus} (isPaid=${isPaid})`)

    // 1. Try api_payments
    const { data: apiPayment } = await supabase
      .from('api_payments')
      .select('*')
      .eq('external_id', transactionId)
      .eq('provider', 'bestfy')
      .maybeSingle()

    if (apiPayment) {
      console.log('📋 Found API payment:', apiPayment.id)

      if (apiPayment.status === 'paid') {
        processedEvents.add(eventKey)
        return new Response(JSON.stringify({ success: true, message: 'Already paid' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (isPaid) {
        await supabase
          .from('api_payments')
          .update({ status: 'paid', paid_at: paymentConfirmedAt || new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', apiPayment.id)

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

    // 2. Try checkout_payments PIX (compare as text – accepts numeric and string forms)
    let checkoutPayment: any = null
    let checkoutSource = ''

    const { data: pixCheckout } = await supabase
      .from('checkout_payments')
      .select('*, checkouts!checkout_payments_checkout_id_fkey(user_id)')
      .filter('pix_data->>financialTransactionId', 'eq', transactionId)
      .maybeSingle()

    if (pixCheckout) {
      checkoutPayment = pixCheckout
      checkoutSource = 'pix'
    } else {
      const { data: cardCheckout } = await supabase
        .from('checkout_payments')
        .select('*, checkouts!checkout_payments_checkout_id_fkey(user_id)')
        .filter('card_data->>bestfy_transaction_id', 'eq', transactionId)
        .maybeSingle()

      if (cardCheckout) {
        checkoutPayment = cardCheckout
        checkoutSource = 'card'
      }
    }

    if (checkoutPayment) {
      console.log(`📋 Found checkout payment (${checkoutSource}):`, checkoutPayment.id)
      const checkoutUserId = checkoutPayment.checkouts?.user_id

      if (checkoutPayment.status === 'paid') {
        processedEvents.add(eventKey)
        return new Response(JSON.stringify({ success: true, message: 'Already paid' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const isCancelled = ['cancelled', 'denied'].includes(internalStatus)

      if (isPaid && checkoutUserId) {
        await supabase
          .from('checkout_payments')
          .update({ status: 'paid', paid_at: paymentConfirmedAt || new Date().toISOString() })
          .eq('id', checkoutPayment.id)

        const netAmount = checkoutPayment.net_amount
        await supabase.rpc('incrementar_saldo_usuario', { p_user_id: checkoutUserId, p_amount: netAmount })

        await supabase
          .from('transactions')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('user_id', checkoutUserId)
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 86400000 * 7).toISOString())
          .like('description', `%${checkoutPayment.customer_name || ''}%`)

        console.log('✅ Checkout payment processed, balance updated:', netAmount)
      } else if (isCancelled && checkoutUserId) {
        await supabase
          .from('checkout_payments')
          .update({ status: 'failed' })
          .eq('id', checkoutPayment.id)

        const txStatus = internalStatus === 'denied' ? 'denied' : 'cancelled'
        await supabase
          .from('transactions')
          .update({ status: txStatus, updated_at: new Date().toISOString() })
          .eq('user_id', checkoutUserId)
          .eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 86400000 * 7).toISOString())
          .like('description', `%${checkoutPayment.customer_name || ''}%`)

        console.log(`❌ Checkout payment ${checkoutPayment.id} marked as ${txStatus}`)
      } else {
        await supabase
          .from('checkout_payments')
          .update({ status: internalStatus === 'approved' ? 'paid' : internalStatus })
          .eq('id', checkoutPayment.id)
      }

      processedEvents.add(eventKey)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Check deposits whose qr_code contains bestfy reference
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(50)

    if (deposits) {
      for (const deposit of deposits) {
        if (deposit.qr_code && deposit.qr_code.includes(transactionId)) {
          console.log('📋 Found deposit by qr_code match:', deposit.id)

          if (isPaid) {
            const { data: userSettings } = await supabase
              .from('settings')
              .select('deposit_fee')
              .eq('user_id', deposit.user_id)
              .maybeSingle()

            const userFeePercent = userSettings?.deposit_fee || 11.99
            const providerFee = 1.50
            const percentageFee = (deposit.amount * userFeePercent) / 100
            const netAmount = deposit.amount - percentageFee - providerFee

            await supabase.from('deposits').update({ status: 'completed' }).eq('id', deposit.id)

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

            await supabase.rpc('incrementar_saldo_usuario', { p_user_id: deposit.user_id, p_amount: netAmount })
            console.log('✅ Deposit processed via Bestfy, balance updated:', netAmount)
          }

          processedEvents.add(eventKey)
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    console.log('⚠️ Bestfy transaction not found in system:', transactionId)
    processedEvents.add(eventKey)

    if (processedEvents.size > 1000) {
      const arr = Array.from(processedEvents)
      processedEvents.clear()
      arr.slice(-500).forEach(e => processedEvents.add(e))
    }

    return new Response(JSON.stringify({ success: true, message: 'Transaction not matched', transactionId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('❌ Bestfy webhook error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
