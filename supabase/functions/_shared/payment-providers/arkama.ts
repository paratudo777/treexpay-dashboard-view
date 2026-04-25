import type { PixProvider, PixCreateParams, PixCreateResult } from './types.ts'

/**
 * Arkama PIX Provider
 * Docs: https://arkama.readme.io
 *
 * Endpoints:
 *   POST {baseUrl}/orders                 → create
 *   GET  {baseUrl}/orders/{id}            → fetch
 *   POST {baseUrl}/orders/{id}/refund     → refund
 *
 * Auth: Authorization: Bearer ARKAMA_API_TOKEN
 *
 * Body fields used:
 *   value (float, BRL — NOT cents), paymentMethod ("pix"|"credit_card"),
 *   customer { name, email, document, phone? },
 *   items[] { title, unitPrice, quantity, tangible },
 *   ip, externalRef, postbackUrl
 */
export class ArkamaProvider implements PixProvider {
  name = 'arkama'

  private baseUrl: string
  private token: string

  constructor() {
    this.baseUrl = (Deno.env.get('ARKAMA_BASE_URL') || 'https://app.arkama.com.br/api/v1').replace(/\/$/, '')
    this.token = Deno.env.get('ARKAMA_API_TOKEN') || ''
  }

  isAvailable(): boolean {
    return !!this.token
  }

  async createPix(params: PixCreateParams): Promise<PixCreateResult> {
    if (!this.isAvailable()) {
      throw new Error(`[${this.name}] credentials not configured (set ARKAMA_API_TOKEN)`)
    }

    const meta = (params.metadata || {}) as Record<string, unknown>
    let externalRef: string
    if (meta.deposit_id) {
      externalRef = `deposit_${meta.deposit_id}`
    } else if (meta.checkout_id) {
      externalRef = `checkout_${meta.checkout_id}_${Date.now()}`
    } else {
      externalRef = `api_payment_${params.paymentId}`
    }

    // Arkama expects BRL float (not cents)
    const value = Number(params.amount.toFixed(2))

    const customerName = params.customer?.name?.trim() || 'Cliente Teste'
    const customerEmail = params.customer?.email?.trim() || 'cliente.teste@treexpay.site'
    const customerDocument = (params.customer?.document || '11144477735').replace(/\D/g, '') || '11144477735'
    const customerCellphone = (params.customer?.phone || '11999999999').replace(/\D/g, '') || '11999999999'
    const body = {
      value,
      paymentMethod: 'pix',
      externalRef,
      postbackUrl: params.webhookUrl,
      ip: '189.40.90.12',
      userAgent: 'TreexPay/1.0',
      customer: {
        name: customerName,
        email: customerEmail,
        document: customerDocument,
        cellphone: customerCellphone,
      },
      shipping: {
        address: {
          street: 'Rua Digital',
          number: '0',
          complement: '',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          cep: '01001000',
        },
      },
      items: [
        {
          title: params.description || 'Pagamento',
          unitPrice: value.toFixed(2),
          quantity: 1,
          tangible: false,
          isDigital: true,
          productId: 'treexpay-digital',
          variant: 'default',
          variantId: 'default',
        },
      ],
    }

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TreexPay',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const raw = await response.text()
    let data: any
    try { data = JSON.parse(raw) } catch { data = { raw } }

    if (!response.ok) {
      console.error(`[${this.name}] PIX creation failed (${response.status}):`, raw)
      throw new Error(`[${this.name}] PIX creation failed: ${response.status} ${raw.slice(0, 300)}`)
    }

    console.log(`[${this.name}] PIX created OK`)

    // Arkama may nest pix data under data.pix or data.order.pix — try several shapes
    const order = data?.data ?? data?.order ?? data
    const pix = order?.pix ?? order?.pixData ?? order?.qrcode_data ?? {}

    const pixCode =
      pix?.qrcode ?? pix?.qrCode ?? pix?.copyPaste ??
      pix?.copy_paste ?? pix?.emv ?? pix?.code ?? ''
    const qrImage =
      pix?.qrcodeImage ?? pix?.qrCodeImage ?? pix?.image ?? pix?.qrcode ?? pixCode

    return {
      external_id: String(order?.id ?? order?.orderId ?? externalRef),
      pix_code: pixCode,
      qr_code: qrImage,
      expires_at: pix?.expiresAt ?? pix?.expirationDate ?? new Date(Date.now() + 3600_000).toISOString(),
      provider: this.name,
      raw: data,
    }
  }
}
