# Checklist de Testes no Postman/Insomnia - TreexPay API

## Pré-requisitos

1. Instale Postman: https://www.postman.com/downloads/
2. Tenha em mãos:
   - API Key de teste: `sk_test_sandbox123xyz`
   - Merchant ID: `mch_test_abc123`
   - Client ID e Client Secret (se testar OAuth)

---

## Collection Base URL

Configure variáveis de ambiente no Postman:

| Variável | Valor Produção | Valor Sandbox |
|----------|----------------|---------------|
| `base_url` | `https://treexpay.site/api/v1` | `https://sandbox.treexpay.site/api/v1` |
| `api_key` | `sk_live_sua_key` | `sk_test_sandbox123xyz` |
| `merchant_id` | `mch_sua_id` | `mch_test_abc123` |

---

## 1. Health Check ✅

**Objetivo**: Verificar se API está acessível

### Request:
```
GET {{base_url}}/health
```

### Headers:
Nenhum header necessário

### Resposta Esperada (200 OK):
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-01-10T14:30:00Z"
}
```

### Validação:
- [ ] Status 200
- [ ] `status` é "ok"
- [ ] `version` presente

---

## 2. Criar Pagamento PIX ✅

**Objetivo**: Criar pagamento com método PIX

### Request:
```
POST {{base_url}}/payments
```

### Headers:
```
X-API-Key: {{api_key}}
Content-Type: application/json
Idempotency-Key: {{$guid}}
```

### Body (JSON):
```json
{
  "amount": 10000,
  "currency": "BRL",
  "payment_method": {
    "type": "pix"
  },
  "customer": {
    "name": "Cliente Teste Postman",
    "email": "teste@treexpay.site",
    "document": "12345678901"
  },
  "metadata": {
    "order_id": "POSTMAN-001"
  }
}
```

### Resposta Esperada (201 Created):
```json
{
  "id": "pay_abc123xyz",
  "status": "created",
  "amount": 10000,
  "currency": "BRL",
  "payment_method": {
    "type": "pix",
    "pix": {
      "qr_code": "00020126580014br.gov.bcb.pix...",
      "qr_code_url": "https://treexpay.site/qr/pay_abc123xyz.png",
      "expiration": "2025-01-10T15:30:00Z"
    }
  },
  "customer": {
    "name": "Cliente Teste Postman",
    "email": "teste@treexpay.site",
    "document": "12345678901"
  },
  "metadata": {
    "order_id": "POSTMAN-001"
  },
  "created_at": "2025-01-10T14:30:00Z",
  "updated_at": "2025-01-10T14:30:00Z"
}
```

### Validação:
- [ ] Status 201
- [ ] `id` presente (formato: `pay_*`)
- [ ] `status` é "created"
- [ ] `qr_code` presente
- [ ] `qr_code_url` presente

**Salve o `payment_id` para testes seguintes!**

---

## 3. Consultar Pagamento ✅

**Objetivo**: Buscar detalhes do pagamento criado

### Request:
```
GET {{base_url}}/payments/{{payment_id}}
```

### Headers:
```
X-API-Key: {{api_key}}
```

### Resposta Esperada (200 OK):
```json
{
  "id": "pay_abc123xyz",
  "status": "paid",
  "amount": 10000,
  ...
}
```

### Validação:
- [ ] Status 200
- [ ] `id` corresponde ao pagamento criado
- [ ] No sandbox, `status` muda para "paid" automaticamente após 2 segundos

---

## 4. Criar Pagamento com Cartão (Aprovado) ✅

**Objetivo**: Testar pagamento com cartão aprovado

### Request:
```
POST {{base_url}}/payments
```

### Headers:
```
X-API-Key: {{api_key}}
Content-Type: application/json
Idempotency-Key: {{$guid}}
```

### Body (JSON):
```json
{
  "amount": 5000,
  "currency": "BRL",
  "payment_method": {
    "type": "credit_card",
    "card": {
      "number": "4111111111111111",
      "holder_name": "TESTE APROVADO",
      "expiry_month": "12",
      "expiry_year": "2025",
      "cvv": "123"
    }
  },
  "customer": {
    "name": "Cliente Cartão",
    "email": "cartao@treexpay.site",
    "document": "98765432100"
  }
}
```

### Resposta Esperada (201 Created):
```json
{
  "id": "pay_card123",
  "status": "processing",
  "amount": 5000,
  "payment_method": {
    "type": "credit_card",
    "last4": "1111",
    "brand": "visa"
  },
  ...
}
```

### Validação:
- [ ] Status 201
- [ ] `status` é "processing" ou "paid"
- [ ] `last4` é "1111"
- [ ] Número completo do cartão NÃO está na resposta (segurança)

---

## 5. Criar Pagamento com Cartão (Recusado) ✅

**Objetivo**: Testar tratamento de cartão recusado

### Request:
```
POST {{base_url}}/payments
```

### Headers:
```
X-API-Key: {{api_key}}
Content-Type: application/json
Idempotency-Key: {{$guid}}
```

### Body (JSON):
```json
{
  "amount": 5000,
  "currency": "BRL",
  "payment_method": {
    "type": "credit_card",
    "card": {
      "number": "4000000000000002",
      "holder_name": "TESTE RECUSADO",
      "expiry_month": "12",
      "expiry_year": "2025",
      "cvv": "123"
    }
  },
  "customer": {
    "name": "Cliente Recusado",
    "email": "recusado@treexpay.site",
    "document": "11122233344"
  }
}
```

### Resposta Esperada (201 Created, mas status failed):
```json
{
  "id": "pay_declined",
  "status": "failed",
  "failure_code": "card_declined",
  "failure_message": "Cartão recusado pelo banco emissor",
  ...
}
```

### Validação:
- [ ] Status 201 (pagamento criado)
- [ ] `status` é "failed"
- [ ] `failure_code` presente

---

## 6. Registrar Webhook ✅

**Objetivo**: Configurar endpoint para receber notificações

### Request:
```
POST {{base_url}}/webhooks
```

### Headers:
```
X-API-Key: {{api_key}}
Content-Type: application/json
```

### Body (JSON):
```json
{
  "url": "https://webhook.site/seu-uuid-aqui",
  "events": [
    "payment.paid",
    "payment.failed",
    "payout.completed"
  ],
  "description": "Webhook de testes Postman"
}
```

**Dica**: Use https://webhook.site para gerar uma URL de teste

### Resposta Esperada (201 Created):
```json
{
  "id": "whk_abc123",
  "url": "https://webhook.site/seu-uuid",
  "secret": "whsec_xyz789abc123",
  "events": [
    "payment.paid",
    "payment.failed",
    "payout.completed"
  ],
  "created_at": "2025-01-10T14:30:00Z"
}
```

### Validação:
- [ ] Status 201
- [ ] `secret` presente (GUARDAR para validar webhooks!)
- [ ] `events` contém os eventos solicitados

---

## 7. Consultar Saldo ✅

**Objetivo**: Ver saldo disponível do merchant

### Request:
```
GET {{base_url}}/merchants/{{merchant_id}}/balance
```

### Headers:
```
X-API-Key: {{api_key}}
```

### Resposta Esperada (200 OK):
```json
{
  "merchant_id": "mch_test_abc123",
  "available": 150000,
  "pending": 25000,
  "total": 175000,
  "currency": "BRL",
  "last_updated": "2025-01-10T14:30:00Z"
}
```

### Validação:
- [ ] Status 200
- [ ] `available` >= 0
- [ ] `total` = `available` + `pending`

---

## 8. Criar Payout ✅

**Objetivo**: Solicitar saque do saldo disponível

### Request:
```
POST {{base_url}}/merchants/{{merchant_id}}/payouts
```

### Headers:
```
X-API-Key: {{api_key}}
Content-Type: application/json
Idempotency-Key: {{$guid}}
```

### Body (JSON):
```json
{
  "amount": 50000,
  "destination": {
    "type": "pix",
    "pix_key": "teste@treexpay.site",
    "pix_key_type": "email"
  },
  "metadata": {
    "reason": "Teste Postman"
  }
}
```

### Resposta Esperada (201 Created):
```json
{
  "id": "pyt_abc123",
  "merchant_id": "mch_test_abc123",
  "amount": 50000,
  "status": "pending",
  "destination": {
    "type": "pix",
    "pix_key": "teste@treexpay.site",
    "pix_key_type": "email"
  },
  "created_at": "2025-01-10T14:30:00Z",
  "completed_at": null,
  "failure_reason": null
}
```

### Validação:
- [ ] Status 201
- [ ] `status` é "pending"
- [ ] No sandbox, muda para "completed" em ~5s

---

## 9. Listar Payouts ✅

**Objetivo**: Ver histórico de saques

### Request:
```
GET {{base_url}}/merchants/{{merchant_id}}/payouts?limit=10&status=completed
```

### Headers:
```
X-API-Key: {{api_key}}
```

### Resposta Esperada (200 OK):
```json
{
  "data": [
    {
      "id": "pyt_abc123",
      "status": "completed",
      "amount": 50000,
      ...
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

### Validação:
- [ ] Status 200
- [ ] Array `data` presente
- [ ] Paginação funcionando

---

## 10. Teste de Idempotência ✅

**Objetivo**: Garantir que mesma key não cria duplicatas

### Request 1:
```
POST {{base_url}}/payments
```

Headers:
```
X-API-Key: {{api_key}}
Content-Type: application/json
Idempotency-Key: idempotency-test-001
```

Body: (qualquer payload válido)

### Request 2:
**REPETIR EXATAMENTE A MESMA REQUISIÇÃO** (mesmo Idempotency-Key e payload)

### Validação:
- [ ] Ambas retornam 201
- [ ] Mesmo `payment.id` em ambas
- [ ] Apenas 1 pagamento criado no banco

---

## 11. Teste de Conflito de Idempotência ⚠️

**Objetivo**: Detectar payload diferente com mesma key

### Request 1:
```
POST {{base_url}}/payments
```

Headers:
```
Idempotency-Key: conflict-test-001
```

Body:
```json
{"amount": 10000, ...}
```

### Request 2:
**MESMA KEY, MAS PAYLOAD DIFERENTE**:
```json
{"amount": 20000, ...}
```

### Resposta Esperada (409 Conflict):
```json
{
  "code": "IDEMPOTENCY_CONFLICT",
  "message": "Idempotency-Key já utilizada com payload diferente",
  "details": {
    "idempotency_key": "conflict-test-001"
  }
}
```

### Validação:
- [ ] Status 409
- [ ] Erro explicando conflito

---

## 12. Teste de OAuth (Opcional) 🔐

**Objetivo**: Trocar authorization code por token

### Passo 1: Gerar code (navegador)
```
https://treexpay.site/api/v1/oauth/authorize?client_id=SEU_CLIENT_ID&redirect_uri=http://localhost:3000/callback&response_type=code&scope=payments:read&state=xyz123
```

### Passo 2: Trocar code por token (Postman)
```
POST {{base_url}}/oauth/token
```

Headers:
```
Content-Type: application/x-www-form-urlencoded
```

Body (x-www-form-urlencoded):
```
grant_type=authorization_code
code=CODE_RECEBIDO
client_id=SEU_CLIENT_ID
client_secret=SEU_CLIENT_SECRET
redirect_uri=http://localhost:3000/callback
```

### Resposta Esperada (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_abc123",
  "scope": "payments:read"
}
```

### Validação:
- [ ] `access_token` presente
- [ ] `refresh_token` presente

---

## 13. Sandbox: Simular Status ⚡

**Objetivo**: Forçar mudança de status manualmente

### Request:
```
POST {{base_url}}/sandbox/payments/simulate
```

Headers:
```
X-API-Key: {{api_key}}
Content-Type: application/json
```

Body:
```json
{
  "payment_id": "pay_abc123",
  "status": "paid"
}
```

### Resposta Esperada (200 OK):
```json
{
  "id": "pay_abc123",
  "status": "paid",
  ...
}
```

### Validação:
- [ ] Status alterado instantaneamente
- [ ] Webhook disparado (se registrado)

---

## Checklist Final ✅

- [ ] Health check retorna 200
- [ ] Criar pagamento PIX funciona
- [ ] Criar pagamento cartão (aprovado) funciona
- [ ] Criar pagamento cartão (recusado) retorna erro correto
- [ ] Consultar pagamento retorna dados corretos
- [ ] Registrar webhook funciona
- [ ] Consultar saldo retorna valores
- [ ] Criar payout funciona
- [ ] Listar payouts retorna array
- [ ] Idempotência funciona (mesma key = mesma resposta)
- [ ] Conflito de idempotência retorna 409
- [ ] Sandbox simulation funciona

---

## Troubleshooting

### Erro 401 Unauthorized
- Verifique se `X-API-Key` está correto
- Confirme que a key começa com `sk_test_` (sandbox) ou `sk_live_` (produção)

### Erro 404 Not Found
- Confirme que `base_url` está correto: `https://treexpay.site/api/v1` (sem barra final)
- Verifique se endpoint existe no OpenAPI spec

### Erro 500 Internal Server Error
- Backend não está rodando
- Verifique logs do servidor
- Contate suporte com `request_id` (no response body)

### Certificado SSL Inválido
- Aguarde propagação DNS (até 24h)
- Verifique se certificado está instalado: `curl -I https://treexpay.site`

---

## Collection Pronta

Importe esta collection JSON no Postman:
(arquivo `TreexPay-API-Collection.json` disponível em `/docs/`)
