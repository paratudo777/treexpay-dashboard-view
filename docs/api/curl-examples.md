# Exemplos cURL - TreexPay API v2

Base URL: `https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway`

## Health Check (público)

```bash
curl https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/health
```

### Resposta:
```json
{
  "status": "ok",
  "service": "TreexPay API Gateway",
  "version": "3.1.0",
  "features": ["pix", "credit_card", "multi-provider", "idempotency"],
  "timestamp": "2026-04-11T19:55:30Z"
}
```

---

## Criar Pagamento PIX

```bash
curl -X POST https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "paymentMethod": "pix",
    "description": "Pedido #12345",
    "customer_email": "cliente@example.com",
    "webhook_url": "https://seusite.com/webhook/pagamento",
    "metadata": {
      "order_id": "PED-12345",
      "store": "Loja Centro"
    }
  }'
```

### Resposta (201):
```json
{
  "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",
  "external_id": "1055320",
  "amount": 10.00,
  "status": "pending",
  "payment_method": "pix",
  "description": "Pedido #12345",
  "customer_email": "cliente@example.com",
  "pix_code": "00020101021226800014br.gov.bcb.pix...",
  "qr_code": "00020101021226800014br.gov.bcb.pix...",
  "expires_at": "2026-04-09T19:55:42.616Z",
  "provider": "novaera",
  "created_at": "2026-04-07T19:55:40.055742+00:00"
}
```

> **Nota:** O `pix_code` é o código copia-e-cola que o cliente usa no app do banco. O `qr_code` pode ser usado para gerar a imagem do QR Code.

---

## Criar Pagamento com Cartão de Crédito

> **Importante:** Pagamentos com cartão de crédito são processados exclusivamente via **Bestfy**. O provedor Bestfy precisa estar configurado com a `BESTFY_API_KEY`.

```bash
curl -X POST https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.00,
    "paymentMethod": "credit_card",
    "description": "Produto Premium",
    "customer": {
      "name": "João da Silva",
      "email": "joao@example.com",
      "document": "11144477735"
    },
    "card": {
      "number": "4111111111111111",
      "cvv": "123",
      "month": "12",
      "year": "2028",
      "firstName": "JOAO",
      "lastName": "DA SILVA"
    },
    "installments": 1,
    "webhook_url": "https://seusite.com/webhook/pagamento"
  }'
```

### Campos do `card`:
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `number` | string | ✅ | Número do cartão (sem espaços) |
| `cvv` | string | ✅ | Código de segurança |
| `month` | string | ✅ | Mês de validade (ex: "12") |
| `year` | string | ✅ | Ano de validade (ex: "2028" ou "28") |
| `firstName` | string | Opcional | Primeiro nome no cartão (se omitido, usa `customer.name`) |
| `lastName` | string | Opcional | Sobrenome no cartão |

### Campos do `customer` (obrigatórios para cartão):
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome completo do cliente |
| `email` | string | Opcional | E-mail do cliente |
| `document` | string | ✅ | CPF do titular (apenas números) |
| `phone` | string | Opcional | Telefone do cliente |

### Resposta (201):
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "external_id": "2055421",
  "amount": 150.00,
  "status": "paid",
  "payment_method": "credit_card",
  "description": "Produto Premium",
  "customer_email": "joao@example.com",
  "provider": "bestfy",
  "created_at": "2026-04-11T15:30:00.000Z",
  "paid_at": "2026-04-11T15:30:02.000Z"
}
```

> **Status possíveis na resposta:**
> - `paid` — Pagamento aprovado imediatamente
> - `pending` — Aguardando confirmação (webhook será enviado)
> - `failed` — Cartão recusado pela operadora

### Parcelamento:
Para pagamentos parcelados, use o campo `installments` (1 a 12):

```bash
curl -X POST https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 600.00,
    "paymentMethod": "credit_card",
    "installments": 6,
    "customer": {
      "name": "Maria Souza",
      "document": "22233344455"
    },
    "card": {
      "number": "5111111111111118",
      "cvv": "456",
      "month": "03",
      "year": "2029"
    }
  }'
```

---

## Criar Pagamento PIX (mínimo)

```bash
curl -X POST https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1.00}'
```

## Listar Pagamentos

```bash
curl "https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments?limit=20&offset=0" \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA"
```

### Resposta:
```json
{
  "data": [
    {
      "id": "73a95625-...",
      "external_id": "1055320",
      "amount": 10.00,
      "status": "paid",
      "description": "Pedido #12345",
      "customer_email": "cliente@example.com",
      "pix_code": "00020101...",
      "qr_code": "00020101...",
      "expires_at": "2026-04-09T19:55:42Z",
      "provider": "novaera",
      "created_at": "2026-04-07T19:55:40Z",
      "paid_at": "2026-04-07T20:01:30Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

## Filtrar por Status

```bash
# Apenas pagamentos pagos
curl "https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments?status=paid" \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA"

# Apenas pendentes
curl "https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments?status=pending" \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA"
```

## Consultar Pagamento Específico

```bash
curl https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments/73a95625-edbe-45c9-9fad-e1d1f277e87c \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA"
```

## Atualizar Status Manualmente

```bash
curl -X PATCH https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments/73a95625-edbe-45c9-9fad-e1d1f277e87c/status \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{"status": "canceled"}'
```

## Usando Authorization Bearer (alternativa)

```bash
curl -X POST https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments \
  -H "Authorization: Bearer sk_live_SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{"amount": 25.50, "description": "Teste com Bearer"}'
```

## Webhook Recebido

Quando o pagamento é confirmado, seu `webhook_url` recebe:

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

Webhooks do dashboard incluem o header `X-Treex-Signature` (HMAC SHA-256).

---

## Resumo dos Métodos de Pagamento

| Método | `paymentMethod` | Provedor | Campos Obrigatórios |
|--------|-----------------|----------|---------------------|
| PIX | `"pix"` (padrão) | NovaEra ou Bestfy | `amount` |
| Cartão de Crédito | `"credit_card"` | Bestfy | `amount`, `card`, `customer.name`, `customer.document` |
