# Exemplos cURL

## Criar Pagamento com Cartão de Crédito

```bash
curl -X POST https://api.gateway.com/v1/payments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount": 10000,
    "currency": "BRL",
    "payment_method": {
      "type": "credit_card",
      "card": {
        "number": "4111111111111111",
        "holder_name": "João Silva",
        "expiry_month": "12",
        "expiry_year": "2025",
        "cvv": "123"
      }
    },
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com",
      "document": "12345678901",
      "phone": "+5511999999999"
    },
    "metadata": {
      "order_id": "ORD-12345",
      "store": "Loja Centro"
    }
  }'
```

### Resposta:
```json
{
  "id": "pay_abc123xyz789",
  "status": "processing",
  "amount": 10000,
  "currency": "BRL",
  "payment_method": {
    "type": "credit_card",
    "last4": "1111",
    "brand": "visa"
  },
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "document": "12345678901",
    "phone": "+5511999999999"
  },
  "metadata": {
    "order_id": "ORD-12345",
    "store": "Loja Centro"
  },
  "created_at": "2025-01-10T14:30:00Z",
  "updated_at": "2025-01-10T14:30:00Z"
}
```

## Criar Pagamento PIX

```bash
curl -X POST https://api.gateway.com/v1/payments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount": 5000,
    "currency": "BRL",
    "payment_method": {
      "type": "pix"
    },
    "customer": {
      "name": "Maria Santos",
      "email": "maria@example.com",
      "document": "98765432100"
    }
  }'
```

### Resposta:
```json
{
  "id": "pay_pix123xyz",
  "status": "created",
  "amount": 5000,
  "currency": "BRL",
  "payment_method": {
    "type": "pix",
    "pix": {
      "qr_code": "00020126580014br.gov.bcb.pix...",
      "qr_code_url": "https://api.gateway.com/qr/pay_pix123xyz.png",
      "expiration": "2025-01-10T15:30:00Z"
    }
  },
  "customer": {
    "name": "Maria Santos",
    "email": "maria@example.com",
    "document": "98765432100"
  },
  "created_at": "2025-01-10T14:30:00Z",
  "updated_at": "2025-01-10T14:30:00Z"
}
```

## Criar Pagamento Boleto

```bash
curl -X POST https://api.gateway.com/v1/payments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount": 15000,
    "currency": "BRL",
    "payment_method": {
      "type": "boleto"
    },
    "customer": {
      "name": "Carlos Oliveira",
      "email": "carlos@example.com",
      "document": "11122233344"
    }
  }'
```

### Resposta:
```json
{
  "id": "pay_bol123xyz",
  "status": "created",
  "amount": 15000,
  "currency": "BRL",
  "payment_method": {
    "type": "boleto",
    "boleto": {
      "barcode": "34191.79001 01043.510047 91020.150008 1 89560000015000",
      "pdf_url": "https://api.gateway.com/boleto/pay_bol123xyz.pdf",
      "expiration": "2025-01-13T23:59:59Z"
    }
  },
  "customer": {
    "name": "Carlos Oliveira",
    "email": "carlos@example.com",
    "document": "11122233344"
  },
  "created_at": "2025-01-10T14:30:00Z",
  "updated_at": "2025-01-10T14:30:00Z"
}
```

## Consultar Pagamento

```bash
curl https://api.gateway.com/v1/payments/pay_abc123xyz789 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Registrar Webhook

```bash
curl -X POST https://api.gateway.com/v1/webhooks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://suaapi.com/webhooks/gateway",
    "events": [
      "payment.created",
      "payment.processing",
      "payment.paid",
      "payment.failed",
      "payout.created",
      "payout.completed"
    ],
    "description": "Webhook principal produção"
  }'
```

### Resposta:
```json
{
  "id": "whk_abc123",
  "url": "https://suaapi.com/webhooks/gateway",
  "secret": "whsec_xyz789abc123",
  "events": [
    "payment.created",
    "payment.processing",
    "payment.paid",
    "payment.failed",
    "payout.created",
    "payout.completed"
  ],
  "created_at": "2025-01-10T14:30:00Z"
}
```

**IMPORTANTE:** Guarde o `secret` com segurança. Ele será usado para validar a assinatura dos webhooks.

## Consultar Saldo

```bash
curl https://api.gateway.com/v1/merchants/mch_abc123/balance \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Resposta:
```json
{
  "merchant_id": "mch_abc123",
  "available": 150000,
  "pending": 25000,
  "total": 175000,
  "currency": "BRL",
  "last_updated": "2025-01-10T14:30:00Z"
}
```

## Criar Payout (Saque)

```bash
curl -X POST https://api.gateway.com/v1/merchants/mch_abc123/payouts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount": 100000,
    "destination": {
      "type": "pix",
      "pix_key": "joao@example.com",
      "pix_key_type": "email"
    },
    "metadata": {
      "reason": "Saque semanal"
    }
  }'
```

### Resposta:
```json
{
  "id": "pyt_abc123xyz",
  "merchant_id": "mch_abc123",
  "amount": 100000,
  "status": "pending",
  "destination": {
    "type": "pix",
    "pix_key": "joao@example.com",
    "pix_key_type": "email"
  },
  "created_at": "2025-01-10T14:30:00Z",
  "completed_at": null,
  "failure_reason": null
}
```

## Listar Payouts

```bash
curl "https://api.gateway.com/v1/merchants/mch_abc123/payouts?status=completed&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Criar API Key

```bash
curl -X POST https://api.gateway.com/v1/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Servidor Produção 1",
    "scopes": ["payments:read", "payments:write", "balance:read"]
  }'
```

### Resposta:
```json
{
  "id": "key_abc123",
  "key": "sk_live_abc123xyz789def456ghi",
  "name": "Servidor Produção 1",
  "created_at": "2025-01-10T14:30:00Z"
}
```

**IMPORTANTE:** A chave completa (`key`) só é mostrada uma vez. Guarde com segurança.

## Usar API Key

Depois de criar, use a API key no header `X-API-Key`:

```bash
curl https://api.gateway.com/v1/payments \
  -H "X-API-Key: sk_live_abc123xyz789def456ghi"
```

## Sandbox: Simular Status de Pagamento

```bash
curl -X POST https://sandbox.gateway.com/v1/sandbox/payments/simulate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "pay_abc123",
    "status": "paid"
  }'
```

## Health Check

```bash
curl https://api.gateway.com/v1/health
```

### Resposta:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-01-10T14:30:00Z"
}
```

## Usando com API Key (sem OAuth)

Para integrações server-to-server, você pode usar API Keys ao invés de OAuth:

```bash
curl -X POST https://api.gateway.com/v1/payments \
  -H "X-API-Key: sk_live_abc123xyz789def456ghi" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "amount": 10000,
    "currency": "BRL",
    "payment_method": {
      "type": "pix"
    },
    "customer": {
      "name": "Cliente Teste",
      "email": "teste@example.com",
      "document": "12345678901"
    }
  }'
```
