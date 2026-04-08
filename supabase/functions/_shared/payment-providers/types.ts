// ── Payment Provider Abstraction ──
// All providers must implement this interface.
// Adding a new provider = create a new file, implement PixProvider, register it.

export interface PixCreateParams {
  amount: number          // in BRL (e.g. 150.00)
  paymentId: string       // internal payment UUID
  webhookUrl: string      // postback URL for the acquirer
  description?: string
  customer?: {
    name?: string
    email?: string
    phone?: string
    document?: string
  }
  metadata?: Record<string, unknown>
}

export interface PixCreateResult {
  external_id: string
  pix_code: string        // copia-e-cola
  qr_code: string         // base64 or URL of QR image
  expires_at: string      // ISO date
  provider: string        // provider name for audit
  raw?: unknown           // raw response for debugging
}

export interface PixProvider {
  name: string
  /** Returns true if this provider has valid credentials and can be used */
  isAvailable(): boolean
  /** Create a PIX charge */
  createPix(params: PixCreateParams): Promise<PixCreateResult>
}

// Future: CardProvider, BoletoProvider, etc.
export interface CardCreateParams {
  amount: number
  paymentId: string
  card_token?: string
  customer?: {
    name?: string
    email?: string
    document?: string
  }
}

export interface CardCreateResult {
  external_id: string
  status: 'approved' | 'refused' | 'pending' | 'processing'
  provider: string
  authorization_code?: string
  raw?: unknown
}

export interface CardProvider {
  name: string
  isAvailable(): boolean
  createCardPayment(params: CardCreateParams): Promise<CardCreateResult>
}
