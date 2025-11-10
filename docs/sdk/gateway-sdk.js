/**
 * Gateway SDK - JavaScript/Node.js
 * 
 * SDK simplificado para integração com a Gateway de Pagamentos
 */

const crypto = require('crypto');
const axios = require('axios');

class GatewaySDK {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.baseURL = config.sandbox 
      ? 'https://sandbox.gateway.com/v1'
      : 'https://api.gateway.com/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: this.apiKey 
        ? { 'X-API-Key': this.apiKey }
        : { 'Authorization': `Bearer ${this.accessToken}` }
    });
  }

  /**
   * Gera Idempotency-Key única
   */
  generateIdempotencyKey() {
    return crypto.randomUUID();
  }

  /**
   * Criar pagamento
   */
  async createPayment(payment, options = {}) {
    const idempotencyKey = options.idempotencyKey || this.generateIdempotencyKey();
    
    const response = await this.client.post('/payments', payment, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
    
    return response.data;
  }

  /**
   * Consultar pagamento
   */
  async getPayment(paymentId) {
    const response = await this.client.get(`/payments/${paymentId}`);
    return response.data;
  }

  /**
   * Criar pagamento com cartão
   */
  async createCardPayment(amount, card, customer, metadata = {}) {
    return this.createPayment({
      amount,
      currency: 'BRL',
      payment_method: {
        type: 'credit_card',
        card
      },
      customer,
      metadata
    });
  }

  /**
   * Criar pagamento PIX
   */
  async createPixPayment(amount, customer, metadata = {}) {
    return this.createPayment({
      amount,
      currency: 'BRL',
      payment_method: {
        type: 'pix'
      },
      customer,
      metadata
    });
  }

  /**
   * Criar pagamento Boleto
   */
  async createBoletoPayment(amount, customer, metadata = {}) {
    return this.createPayment({
      amount,
      currency: 'BRL',
      payment_method: {
        type: 'boleto'
      },
      customer,
      metadata
    });
  }

  /**
   * Registrar webhook
   */
  async registerWebhook(url, events, description = '') {
    const response = await this.client.post('/webhooks', {
      url,
      events,
      description
    });
    
    return response.data;
  }

  /**
   * Listar webhooks
   */
  async listWebhooks() {
    const response = await this.client.get('/webhooks');
    return response.data;
  }

  /**
   * Remover webhook
   */
  async deleteWebhook(webhookId) {
    await this.client.delete(`/webhooks/${webhookId}`);
  }

  /**
   * Validar assinatura de webhook
   */
  verifyWebhook(payload, signature, secret) {
    // payload deve ser string raw, não objeto parseado
    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString, 'utf8')
      .digest('hex');
    
    const expectedSignature = `sha256=${computedSignature}`;
    
    // Timing-safe compare
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Consultar saldo
   */
  async getBalance(merchantId) {
    const response = await this.client.get(`/merchants/${merchantId}/balance`);
    return response.data;
  }

  /**
   * Solicitar payout
   */
  async requestPayout(merchantId, amount, destination, options = {}) {
    const idempotencyKey = options.idempotencyKey || this.generateIdempotencyKey();
    
    const response = await this.client.post(
      `/merchants/${merchantId}/payouts`,
      {
        amount,
        destination,
        metadata: options.metadata || {}
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      }
    );
    
    return response.data;
  }

  /**
   * Listar payouts
   */
  async listPayouts(merchantId, options = {}) {
    const params = {
      status: options.status,
      limit: options.limit || 20,
      offset: options.offset || 0
    };
    
    const response = await this.client.get(
      `/merchants/${merchantId}/payouts`,
      { params }
    );
    
    return response.data;
  }

  /**
   * Criar API Key
   */
  async createApiKey(name, scopes) {
    const response = await this.client.post('/api-keys', {
      name,
      scopes
    });
    
    return response.data;
  }

  /**
   * Listar API Keys
   */
  async listApiKeys() {
    const response = await this.client.get('/api-keys');
    return response.data;
  }

  /**
   * Revogar API Key
   */
  async revokeApiKey(keyId) {
    await this.client.delete(`/api-keys/${keyId}`);
  }
}

/**
 * Classe auxiliar para OAuth2
 */
class GatewayOAuth {
  constructor(clientId, clientSecret, redirectUri, sandbox = false) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.baseURL = sandbox 
      ? 'https://sandbox.gateway.com'
      : 'https://api.gateway.com';
  }

  /**
   * Gerar URL de autorização
   */
  getAuthorizationUrl(scopes, state) {
    const url = new URL(`${this.baseURL}/oauth/authorize`);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scopes.join(' '));
    url.searchParams.set('state', state || crypto.randomBytes(16).toString('hex'));
    
    return url.toString();
  }

  /**
   * Trocar authorization code por access token
   */
  async exchangeCode(code) {
    const response = await axios.post(
      `${this.baseURL}/v1/oauth/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  }

  /**
   * Renovar access token
   */
  async refreshToken(refreshToken) {
    const response = await axios.post(
      `${this.baseURL}/v1/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  }
}

module.exports = {
  GatewaySDK,
  GatewayOAuth
};

/**
 * EXEMPLOS DE USO
 */

// Exemplo 1: Usar com API Key
/*
const { GatewaySDK } = require('./gateway-sdk');

const gateway = new GatewaySDK({
  apiKey: 'sk_live_abc123xyz789',
  sandbox: false
});

// Criar pagamento PIX
const payment = await gateway.createPixPayment(
  10000, // R$ 100,00 em centavos
  {
    name: 'João Silva',
    email: 'joao@example.com',
    document: '12345678901'
  },
  {
    order_id: 'ORD-12345'
  }
);

console.log('QR Code PIX:', payment.payment_method.pix.qr_code);
*/

// Exemplo 2: Usar com OAuth
/*
const { GatewayOAuth, GatewaySDK } = require('./gateway-sdk');

// Iniciar OAuth
const oauth = new GatewayOAuth(
  'app_abc123',
  'secret_xyz789',
  'https://suaapp.com/callback'
);

const authUrl = oauth.getAuthorizationUrl(
  ['payments:read', 'payments:write', 'balance:read'],
  'random_state_123'
);

console.log('Redirecione para:', authUrl);

// Após callback
const tokens = await oauth.exchangeCode('AUTH_CODE_xyz');

// Usar access token
const gateway = new GatewaySDK({
  accessToken: tokens.access_token
});

const balance = await gateway.getBalance('mch_abc123');
console.log('Saldo:', balance.available / 100);
*/

// Exemplo 3: Validar webhook
/*
const express = require('express');
const { GatewaySDK } = require('./gateway-sdk');

const app = express();
const gateway = new GatewaySDK({ apiKey: 'sk_live_abc123' });

app.post('/webhooks/gateway', 
  express.raw({ type: 'application/json' }), 
  (req, res) => {
    const signature = req.headers['x-signature'];
    const secret = 'whsec_xyz789abc123';
    
    const isValid = gateway.verifyWebhook(
      req.body.toString(),
      signature,
      secret
    );
    
    if (!isValid) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
    
    const event = JSON.parse(req.body);
    
    if (event.type === 'payment.paid') {
      console.log('Pagamento confirmado:', event.data.object.id);
      // Liberar produto/serviço
    }
    
    res.status(200).json({ received: true });
  }
);
*/

// Exemplo 4: Solicitar payout
/*
const payout = await gateway.requestPayout(
  'mch_abc123',
  50000, // R$ 500,00
  {
    type: 'pix',
    pix_key: 'email@example.com',
    pix_key_type: 'email'
  }
);

console.log('Payout criado:', payout.id);
*/
