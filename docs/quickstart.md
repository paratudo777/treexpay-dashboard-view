# Quickstart - Integração TreexPay

Guia rápido para integrar a TreexPay e começar a receber pagamentos PIX reais.

## 1. Criar Conta

1. Acesse [treexpay.site](https://treexpay.site)
2. Crie sua conta
3. No dashboard, vá em **API** para obter suas chaves

Suas chaves serão geradas automaticamente:
- `pk_live_...` — Chave pública (identificação)
- `sk_live_...` — Chave secreta (usada nas requisições)

## 2. Criar Primeiro Pagamento PIX

```bash
curl -X POST https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "description": "Pedido #12345",
    "customer_email": "cliente@example.com",
    "webhook_url": "https://seusite.com/webhook",
    "metadata": {
      "order_id": "PED-12345"
    }
  }'
```

**Resposta (201):**
```json
{
  "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",
  "external_id": "1055320",
  "amount": 10.00,
  "status": "pending",
  "description": "Pedido #12345",
  "customer_email": "cliente@example.com",
  "pix_code": "00020101021226800014br.gov.bcb.pix2558qrcode.mkip.com.br/v1/...",
  "qr_code": "00020101021226800014br.gov.bcb.pix2558qrcode.mkip.com.br/v1/...",
  "expires_at": "2026-04-09T19:55:42.616Z",
  "provider": "novaera",
  "created_at": "2026-04-07T19:55:40.055742+00:00"
}
```

**O que fazer com a resposta:**
- Exibir o `pix_code` para o cliente copiar e colar no app do banco
- Gerar um QR Code a partir do `qr_code` para o cliente escanear
- O PIX expira na data indicada em `expires_at`

## 3. Receber Notificação de Pagamento

Quando o cliente pagar o PIX, a TreexPay envia um POST para seu `webhook_url`:

```json
{
  "event": "payment.paid",
  "payment": {
    "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",
    "amount": 10.00,
    "status": "paid",
    "paid_at": "2026-04-07T20:01:30.000Z"
  }
}
```

### Exemplo de webhook handler (Node.js):

```javascript
app.post('/webhook', express.json(), (req, res) => {
  const { event, payment } = req.body;
  
  if (event === 'payment.paid') {
    console.log('Pagamento confirmado:', payment.id);
    // Liberar produto, enviar email, etc.
  }
  
  res.status(200).json({ received: true });
});
```

### Validação HMAC (se usar webhooks do dashboard):

Os webhooks configurados no dashboard incluem o header `X-Treex-Signature` com assinatura HMAC SHA-256:

```javascript
const crypto = require('crypto');

function validateSignature(body, signature, secret) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return computed === signature;
}
```

## 4. Consultar Pagamento

```bash
curl https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments/73a95625-edbe-45c9-9fad-e1d1f277e87c \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA"
```

## 5. Listar Pagamentos

```bash
# Todos os pagamentos
curl "https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments?limit=20&offset=0" \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA"

# Filtrar por status
curl "https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments?status=paid" \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA"
```

## 6. Health Check (público)

```bash
curl https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/health
```

```json
{
  "status": "ok",
  "service": "TreexPay API Gateway",
  "version": "2.0.0",
  "features": ["pix"],
  "timestamp": "2026-04-07T19:55:30.315Z"
}
```

## Referência Rápida

| Endpoint | Método | Descrição |
|---|---|---|
| `/health` | GET | Health check (público) |
| `/payments` | POST | Criar pagamento PIX |
| `/payments` | GET | Listar pagamentos |
| `/payments/:id` | GET | Consultar pagamento |
| `/payments/:id/status` | PATCH | Atualizar status (manual) |

## Fluxo Completo

```
Seu Sistema                    TreexPay                      Adquirente (NovaEra)
    │                              │                              │
    ├── POST /payments ───────────>│                              │
    │                              ├── Cria cobrança PIX ────────>│
    │                              │<── pix_code + qr_code ──────┤
    │<── 201 + dados do PIX ──────┤                              │
    │                              │                              │
    │  (cliente paga no banco)     │                              │
    │                              │<── webhook: pago ────────────┤
    │                              ├── Credita saldo              │
    │<── webhook: payment.paid ───┤                              │
    │                              │                              │
```

## Suporte

- **Dashboard**: [treexpay.site](https://treexpay.site)
- **Suporte**: suporte@treexpay.site
