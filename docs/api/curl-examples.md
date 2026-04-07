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
  "version": "2.0.0",
  "features": ["pix"],
  "timestamp": "2026-04-07T19:55:30Z"
}
```

## Criar Pagamento PIX

```bash
curl -X POST https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway/payments \
  -H "X-API-Key: sk_live_SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
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
  "description": "Pedido #12345",
  "customer_email": "cliente@example.com",
  "pix_code": "00020101021226800014br.gov.bcb.pix2558qrcode.mkip.com.br/v1/b2078627-b083-45ba-a2a4-0d71a4e75da25204000053039865802BR5915CLICKPAGAMENTOS6008SAOPAULO62070503***6304E531",
  "qr_code": "00020101021226800014br.gov.bcb.pix2558qrcode.mkip.com.br/v1/b2078627-b083-45ba-a2a4-0d71a4e75da2...",
  "expires_at": "2026-04-09T19:55:42.616Z",
  "provider": "novaera",
  "created_at": "2026-04-07T19:55:40.055742+00:00"
}
```

> **Nota:** O `pix_code` é o código copia-e-cola que o cliente usa no app do banco. O `qr_code` pode ser usado para gerar a imagem do QR Code.

## Criar Pagamento (mínimo)

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

### Resposta:
```json
{
  "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",
  "external_id": "1055320",
  "amount": 10.00,
  "status": "paid",
  "description": "Pedido #12345",
  "customer_email": "cliente@example.com",
  "pix_code": "00020101...",
  "qr_code": "00020101...",
  "expires_at": "2026-04-09T19:55:42Z",
  "provider": "novaera",
  "metadata": {"order_id": "PED-12345"},
  "webhook_sent": true,
  "created_at": "2026-04-07T19:55:40Z",
  "updated_at": "2026-04-07T20:01:30Z",
  "paid_at": "2026-04-07T20:01:30Z"
}
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

Quando o PIX é pago, seu `webhook_url` recebe:

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
