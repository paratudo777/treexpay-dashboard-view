import type { PixProvider, PixCreateParams, PixCreateResult } from './types.ts'

export class NovaeraProvider implements PixProvider {
  name = 'novaera'

  private baseUrl: string
  private pk: string
  private sk: string

  constructor() {
    this.baseUrl = Deno.env.get('NOVAERA_BASE_URL') || ''
    this.pk = Deno.env.get('NOVAERA_PK') || ''
    this.sk = Deno.env.get('NOVAERA_SK') || ''
  }

  isAvailable(): boolean {
    return !!(this.baseUrl && this.pk && this.sk)
  }

  async createPix(params: PixCreateParams): Promise<PixCreateResult> {
    if (!this.isAvailable()) {
      throw new Error(`[${this.name}] credentials not configured`)
    }

    const credentials = btoa(`${this.sk}:${this.pk}`)
    const externalRef = `api_payment_${params.paymentId}`
    const amountCents = Math.round(params.amount * 100)

    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethod: 'pix',
        amount: amountCents,
        externalRef,
        postbackUrl: params.webhookUrl,
        pix: {
          pixKey: 'treex@tecnologia.com.br',
          pixKeyType: 'email',
          expiresInSeconds: 3600,
        },
        items: [
          { title: params.description || 'Pagamento via API', quantity: 1, tangible: false, unitPrice: amountCents },
        ],
        customer: {
          name: params.customer?.name || 'Cliente API',
          email: params.customer?.email || 'noreply@treexpay.site',
          phone: params.customer?.phone || '5511999999999',
          document: { type: 'cpf', number: params.customer?.document || '11144477735' },
        },
        metadata: JSON.stringify({ origin: 'TreexPay API Gateway', payment_id: params.paymentId, ...(params.metadata || {}) }),
        traceable: false,
        notifications: { email: false, sms: false },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[${this.name}] PIX creation failed:`, errorBody)
      throw new Error(`[${this.name}] PIX creation failed: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[${this.name}] PIX created successfully`)

    return {
      external_id: String(data.data?.id || data.data?.externalId || externalRef),
      pix_code: data.data?.pix?.qrcodeText || data.data?.pix?.qrcode || '',
      qr_code: data.data?.pix?.qrcode || '',
      expires_at: data.data?.pix?.expiresAt || data.data?.pix?.expirationDate || new Date(Date.now() + 3600000).toISOString(),
      provider: this.name,
      raw: data,
    }
  }
}
