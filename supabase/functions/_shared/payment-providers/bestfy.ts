import type { PixProvider, PixCreateParams, PixCreateResult } from './types.ts'

/**
 * Bestfy Payment Provider
 * API Docs: https://docs.bestfy.io/
 * Endpoint: POST https://api.bestfy.io/payment
 * Auth: x-api-key header
 * Amount: in centavos
 * Supports: PIX, CREDIT_CARD, BOLETO
 */
export class BestfyProvider implements PixProvider {
  name = 'bestfy'

  private apiKey: string

  constructor() {
    this.apiKey = Deno.env.get('BESTFY_API_KEY') || ''
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  async createPix(params: PixCreateParams): Promise<PixCreateResult> {
    if (!this.isAvailable()) {
      throw new Error(`[${this.name}] API key not configured`)
    }

    const amountCents = Math.round(params.amount * 100)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

    const body = {
      paymentMethod: 'PIX',
      items: [
        {
          productTitle: params.description || 'Pagamento TreexPay',
          description: params.description || 'Pagamento via TreexPay',
          quantity: 1,
          priceCents: amountCents,
          productType: 'DIGITAL',
        },
      ],
      customer: {
        name: params.customer?.name || 'Cliente',
        email: params.customer?.email || 'noreply@treexpay.site',
        phone: params.customer?.phone?.replace(/\D/g, '') || '5511999999999',
        cpfOrCnpj: params.customer?.document?.replace(/\D/g, '') || '11144477735',
      },
      metadata: JSON.stringify({
        origin: 'TreexPay',
        payment_id: params.paymentId,
        ...(params.metadata || {}),
      }),
      postbackUrl: params.webhookUrl || `${SUPABASE_URL}/functions/v1/bestfy-webhook`,
    }

    console.log(`[${this.name}] Creating PIX payment...`)

    const response = await fetch('https://api.bestfy.io/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TreexPay',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[${this.name}] PIX creation failed:`, errorBody)
      throw new Error(`[${this.name}] PIX creation failed: ${response.status} - ${errorBody}`)
    }

    const data = await response.json()
    console.log(`[${this.name}] PIX created successfully:`, data.financialTransactionId)

    return {
      external_id: data.financialTransactionId,
      pix_code: data.qrCodeText || '',
      qr_code: data.qrCode || '',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      provider: this.name,
      raw: data,
    }
  }

  /**
   * Create a credit card payment via Bestfy
   */
  async createCreditCard(params: {
    amount: number
    paymentId: string
    customer: {
      name: string
      email: string
      phone: string
      document: string
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
    webhookUrl?: string
    metadata?: Record<string, unknown>
  }): Promise<{
    financialTransactionId: string
    status: string
    provider: string
    raw: unknown
  }> {
    if (!this.isAvailable()) {
      throw new Error(`[${this.name}] API key not configured`)
    }

    const amountCents = Math.round(params.amount * 100)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

    const body = {
      paymentMethod: 'CREDIT_CARD',
      items: [
        {
          productTitle: params.description || 'Pagamento TreexPay',
          description: params.description || 'Pagamento via TreexPay',
          quantity: 1,
          priceCents: amountCents,
          productType: 'DIGITAL',
        },
      ],
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        phone: params.customer.phone.replace(/\D/g, ''),
        cpfOrCnpj: params.customer.document.replace(/\D/g, ''),
      },
      creditCard: {
        number: params.card.number.replace(/\s/g, ''),
        verificationValue: params.card.cvv,
        firstName: params.card.firstName,
        lastName: params.card.lastName,
        month: params.card.month,
        year: params.card.year,
        numberOfInstallments: params.card.installments || 1,
      },
      metadata: JSON.stringify({
        origin: 'TreexPay',
        payment_id: params.paymentId,
        ...(params.metadata || {}),
      }),
      postbackUrl: params.webhookUrl || `${SUPABASE_URL}/functions/v1/bestfy-webhook`,
    }

    console.log(`[${this.name}] Creating credit card payment...`)

    const response = await fetch('https://api.bestfy.io/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TreexPay',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[${this.name}] Card payment failed:`, errorBody)
      throw new Error(`[${this.name}] Card payment failed: ${response.status} - ${errorBody}`)
    }

    const data = await response.json()
    console.log(`[${this.name}] Card payment created:`, data.financialTransactionId)

    return {
      financialTransactionId: data.financialTransactionId,
      status: 'pending',
      provider: this.name,
      raw: data,
    }
  }

  /**
   * Create a Boleto payment via Bestfy
   */
  async createBoleto(params: {
    amount: number
    paymentId: string
    customer: {
      name: string
      email: string
      phone: string
      document: string
    }
    address: {
      postalCode: string
      neighborhood: string
      city: string
      state: string
      streetAddress: string
      streetNumber: string
    }
    description?: string
    webhookUrl?: string
    metadata?: Record<string, unknown>
  }): Promise<{
    financialTransactionId: string
    boletoUrl?: string
    boletoBarcode?: string
    provider: string
    raw: unknown
  }> {
    if (!this.isAvailable()) {
      throw new Error(`[${this.name}] API key not configured`)
    }

    const amountCents = Math.round(params.amount * 100)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''

    const body = {
      paymentMethod: 'BOLETO',
      items: [
        {
          productTitle: params.description || 'Pagamento TreexPay',
          description: params.description || 'Pagamento via TreexPay',
          quantity: 1,
          priceCents: amountCents,
          productType: 'COMMON',
        },
      ],
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        phone: params.customer.phone.replace(/\D/g, ''),
        cpfOrCnpj: params.customer.document.replace(/\D/g, ''),
      },
      address: params.address,
      metadata: JSON.stringify({
        origin: 'TreexPay',
        payment_id: params.paymentId,
        ...(params.metadata || {}),
      }),
      postbackUrl: params.webhookUrl || `${SUPABASE_URL}/functions/v1/bestfy-webhook`,
    }

    console.log(`[${this.name}] Creating boleto payment...`)

    const response = await fetch('https://api.bestfy.io/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TreexPay',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[${this.name}] Boleto creation failed:`, errorBody)
      throw new Error(`[${this.name}] Boleto creation failed: ${response.status} - ${errorBody}`)
    }

    const data = await response.json()
    console.log(`[${this.name}] Boleto created:`, data.financialTransactionId)

    return {
      financialTransactionId: data.financialTransactionId,
      boletoUrl: data.boletoUrl || data.url,
      boletoBarcode: data.boletoBarcode || data.barcode,
      provider: this.name,
      raw: data,
    }
  }
}
