/**
 * Stripe Payment Provider — Credit Card only
 * API Docs: https://stripe.com/docs/api/payment_intents
 * Auth: Bearer <STRIPE_SECRET_KEY>
 * Amount: in cents
 */
export class StripeProvider {
  name = 'stripe'
  private secretKey: string

  constructor() {
    this.secretKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
  }

  isAvailable(): boolean {
    return !!this.secretKey
  }

  /**
   * Stripe expects card data as a PaymentMethod. We create the PM + PaymentIntent
   * in a single confirm=true call using payment_method_data on PaymentIntent.
   * Returns normalized result similar to Bestfy.createCreditCard.
   */
  async createCreditCard(params: {
    amount: number
    paymentId: string
    customer: {
      name: string
      email: string
      phone: string
      document: string
      ip?: string
    }
    card: {
      number: string
      cvv: string
      firstName: string
      lastName: string
      month: string
      year: string
      installments?: number
    }
    description?: string
    metadata?: Record<string, unknown>
    clientIp?: string
    userAgent?: string
  }): Promise<{
    financialTransactionId: string
    status: string
    provider: string
    raw: unknown
  }> {
    if (!this.isAvailable()) {
      throw new Error(`[${this.name}] STRIPE_SECRET_KEY not configured`)
    }

    const amountCents = Math.round(params.amount * 100)
    const fullName = `${params.card.firstName} ${params.card.lastName}`.trim() || params.customer.name

    const form = new URLSearchParams()
    form.append('amount', String(amountCents))
    form.append('currency', 'brl')
    form.append('confirm', 'true')
    form.append('payment_method_data[type]', 'card')
    form.append('payment_method_data[card][number]', params.card.number.replace(/\s/g, ''))
    form.append('payment_method_data[card][exp_month]', params.card.month)
    form.append('payment_method_data[card][exp_year]', params.card.year.length === 2 ? `20${params.card.year}` : params.card.year)
    form.append('payment_method_data[card][cvc]', params.card.cvv)
    form.append('payment_method_data[billing_details][name]', fullName)
    form.append('payment_method_data[billing_details][email]', params.customer.email)
    form.append('payment_method_data[billing_details][phone]', params.customer.phone)
    form.append('automatic_payment_methods[enabled]', 'true')
    form.append('automatic_payment_methods[allow_redirects]', 'never')
    form.append('description', params.description || 'Pagamento TreexPay')
    form.append('metadata[origin]', 'TreexPay')
    form.append('metadata[payment_id]', params.paymentId)
    form.append('metadata[source]', 'checkout_web')
    if (params.metadata) {
      for (const [k, v] of Object.entries(params.metadata)) {
        form.append(`metadata[${k}]`, String(v))
      }
    }

    console.log(`[${this.name}] Creating card PaymentIntent...`)

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      const msg = data?.error?.message || JSON.stringify(data)
      console.error(`[${this.name}] Card payment failed:`, msg)
      throw new Error(`[${this.name}] Card payment failed: ${response.status} - ${msg}`)
    }

    console.log(`[${this.name}] PaymentIntent created:`, data.id, 'status:', data.status)

    // Stripe statuses: succeeded, requires_action, requires_payment_method, processing, canceled
    let normalized = 'pending'
    if (data.status === 'succeeded') normalized = 'approved'
    else if (data.status === 'requires_payment_method' || data.status === 'canceled') normalized = 'refused'
    else if (data.status === 'processing' || data.status === 'requires_action' || data.status === 'requires_confirmation') normalized = 'pending'

    return {
      financialTransactionId: data.id,
      status: normalized,
      provider: this.name,
      raw: data,
    }
  }
}
