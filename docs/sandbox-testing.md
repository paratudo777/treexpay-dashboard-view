# Plano de Testes End-to-End (Sandbox)

## Configuração do Sandbox

### URLs
- **API**: `https://sandbox.gateway.com/v1`
- **Dashboard**: `https://sandbox-dashboard.gateway.com`

### Diferenças do Sandbox
- Sem cobranças reais
- PIX confirmado instantaneamente
- Cartões simulados
- Webhooks disparados imediatamente
- Sem integração real com bancos

### Credenciais de Teste
```
API Key: sk_test_sandbox123xyz
Merchant ID: mch_test_abc123
```

## Cenários de Teste

### 1. Fluxo de Sucesso - PIX

**Objetivo**: Criar pagamento PIX e simular confirmação instantânea

```bash
# 1. Criar pagamento PIX
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-pix-success-001" \
  -d '{
    "amount": 10000,
    "currency": "BRL",
    "payment_method": {
      "type": "pix"
    },
    "customer": {
      "name": "Cliente Teste PIX",
      "email": "teste-pix@example.com",
      "document": "12345678901"
    },
    "metadata": {
      "test_case": "pix_success"
    }
  }'
```

**Resultado Esperado**:
- Status: 201 Created
- `payment.status`: "created"
- `payment_method.pix.qr_code`: presente
- `payment_method.pix.qr_code_url`: presente

**Validações**:
1. ✅ QR Code gerado
2. ✅ Webhook `payment.created` disparado imediatamente
3. ✅ Após 2 segundos, webhook `payment.paid` disparado (simulação automática)
4. ✅ Saldo do merchant incrementado
5. ✅ Ledger transaction criada
6. ✅ Transaction com status `approved` criada

---

### 2. Fluxo de Sucesso - Cartão Aprovado

**Objetivo**: Pagamento com cartão aprovado

```bash
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-card-success-001" \
  -d '{
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
      "name": "Cliente Teste Cartão",
      "email": "teste-card@example.com",
      "document": "98765432100"
    }
  }'
```

**Resultado Esperado**:
- Status: 201 Created
- `payment.status`: "processing" → "paid" (em 2s)
- Webhook `payment.processing` disparado
- Webhook `payment.paid` disparado após 2s

**Validações**:
1. ✅ Pagamento processado
2. ✅ Valor vai para `pending` balance (não `available`)
3. ✅ Retenção de 30 dias aplicada
4. ✅ Last4: "1111"

---

### 3. Fluxo de Falha - Cartão Recusado

**Objetivo**: Testar cartão recusado

```bash
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-card-declined-001" \
  -d '{
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
      "name": "Cliente Teste Falha",
      "email": "teste-declined@example.com",
      "document": "11122233344"
    }
  }'
```

**Resultado Esperado**:
- Status: 201 Created
- `payment.status`: "failed"
- `failure_code`: "card_declined"
- Webhook `payment.failed` disparado

**Validações**:
1. ✅ Pagamento falhou
2. ✅ Saldo não alterado
3. ✅ Transaction com status `denied`

---

### 4. Cartões de Teste do Sandbox

| Número | Resultado | Decline Code |
|--------|-----------|--------------|
| 4111111111111111 | Sucesso | - |
| 4000000000000002 | Recusado | card_declined |
| 4000000000000010 | Recusado | insufficient_funds |
| 4000000000000028 | Recusado | expired_card |
| 4000000000000036 | Recusado | invalid_cvc |
| 4000000000000044 | Recusado | lost_card |
| 4000000000000069 | Recusado | fraud_suspected |

---

### 5. Idempotência - Requisição Duplicada (Mesmo Payload)

**Objetivo**: Garantir que mesma key + mesmo payload retorna mesma resposta

```bash
# Requisição 1
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: idempotency-test-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Teste", "email": "teste@example.com", "document": "12345678901"}}'

# Requisição 2 (idêntica)
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: idempotency-test-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Teste", "email": "teste@example.com", "document": "12345678901"}}'
```

**Resultado Esperado**:
- Ambas: Status 201
- Mesmo `payment.id`
- Nenhum pagamento duplicado criado

**Validações**:
1. ✅ Segunda requisição retorna mesmo objeto
2. ✅ Apenas 1 pagamento criado
3. ✅ Apenas 1 webhook enviado

---

### 6. Idempotência - Conflito (Mesma Key, Payload Diferente)

**Objetivo**: Detectar conflito de idempotência

```bash
# Requisição 1
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: idempotency-conflict-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Teste", "email": "teste@example.com", "document": "12345678901"}}'

# Requisição 2 (DIFERENTE - amount alterado)
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: idempotency-conflict-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 20000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Teste", "email": "teste@example.com", "document": "12345678901"}}'
```

**Resultado Esperado**:
- Primeira: 201 Created
- Segunda: 409 Conflict
- Body: `{"code": "IDEMPOTENCY_CONFLICT", "message": "..."}`

---

### 7. Webhook - Entrega com Sucesso

**Objetivo**: Webhook entregue na primeira tentativa

**Setup**:
```bash
# Registrar webhook apontando para webhook.site ou ngrok
curl -X POST https://sandbox.gateway.com/v1/webhooks \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/seu-uuid",
    "events": ["payment.paid"]
  }'
```

**Ação**:
```bash
# Criar pagamento PIX
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: webhook-success-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Teste Webhook", "email": "webhook@example.com", "document": "12345678901"}}'
```

**Validações**:
1. ✅ Webhook recebido em webhook.site
2. ✅ Header `X-Signature` presente
3. ✅ Assinatura válida (validar com secret)
4. ✅ Payload contém evento `payment.paid`

---

### 8. Webhook - Falha e Retry

**Objetivo**: Testar retry quando endpoint retorna 500

**Setup**:
```bash
# Registrar webhook apontando para endpoint que retorna 500
curl -X POST https://sandbox.gateway.com/v1/webhooks \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpstat.us/500",
    "events": ["payment.paid"]
  }'
```

**Ação**:
```bash
# Criar pagamento
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: webhook-retry-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Teste Retry", "email": "retry@example.com", "document": "12345678901"}}'
```

**Validações**:
1. ✅ Primeira tentativa falha (500)
2. ✅ Sistema agenda retry em 30s
3. ✅ Dashboard mostra webhook com status "retrying"
4. ✅ Após múltiplas falhas, marcar como "failed"

---

### 9. Payout - Saldo Insuficiente

**Objetivo**: Tentar payout com saldo insuficiente

```bash
curl -X POST https://sandbox.gateway.com/v1/merchants/mch_test_abc123/payouts \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: payout-insufficient-001" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 999999999,
    "destination": {
      "type": "pix",
      "pix_key": "teste@example.com",
      "pix_key_type": "email"
    }
  }'
```

**Resultado Esperado**:
- Status: 422 Unprocessable Entity
- Code: "INSUFFICIENT_BALANCE"
- Details com saldo disponível

---

### 10. Payout - Sucesso

**Objetivo**: Criar payout bem-sucedido

**Setup**: Garantir saldo disponível (criar pagamento PIX antes)

```bash
# 1. Criar pagamento para ter saldo
curl -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: payout-setup-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Setup", "email": "setup@example.com", "document": "12345678901"}}'

# 2. Aguardar 2s (PIX confirmado)

# 3. Criar payout
curl -X POST https://sandbox.gateway.com/v1/merchants/mch_test_abc123/payouts \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: payout-success-001" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 30000,
    "destination": {
      "type": "pix",
      "pix_key": "teste@example.com",
      "pix_key_type": "email"
    }
  }'
```

**Resultado Esperado**:
- Status: 201 Created
- `payout.status`: "pending" → "completed" (em 5s no sandbox)
- Webhook `payout.completed` disparado

**Validações**:
1. ✅ Payout criado
2. ✅ Saldo `available` debitado
3. ✅ Ledger transaction criada (type: "payout")
4. ✅ Webhook recebido

---

### 11. Simulação Manual de Status (Sandbox Only)

**Objetivo**: Forçar mudança de status

```bash
# Criar pagamento PIX
PAYMENT_ID=$(curl -s -X POST https://sandbox.gateway.com/v1/payments \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Idempotency-Key: manual-sim-001" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Manual Sim", "email": "manual@example.com", "document": "12345678901"}}' \
  | jq -r '.id')

# Forçar status "paid"
curl -X POST https://sandbox.gateway.com/v1/sandbox/payments/simulate \
  -H "X-API-Key: sk_test_sandbox123xyz" \
  -H "Content-Type: application/json" \
  -d "{\"payment_id\": \"$PAYMENT_ID\", \"status\": \"paid\"}"
```

**Validações**:
1. ✅ Status alterado instantaneamente
2. ✅ Webhook disparado
3. ✅ Saldo atualizado

---

### 12. Limpar Sandbox

**Objetivo**: Resetar todos os dados de teste

```bash
curl -X POST https://sandbox.gateway.com/v1/sandbox/reset \
  -H "X-API-Key: sk_test_sandbox123xyz"
```

**Resultado**: Todos os payments, payouts, ledger limpos

---

## Automação dos Testes

### Script de Teste Completo (Bash)

```bash
#!/bin/bash
set -e

API_KEY="sk_test_sandbox123xyz"
BASE_URL="https://sandbox.gateway.com/v1"

echo "🧪 Iniciando testes..."

# Teste 1: PIX Success
echo "1️⃣ Testando PIX (sucesso)..."
curl -s -X POST $BASE_URL/payments \
  -H "X-API-Key: $API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "BRL", "payment_method": {"type": "pix"}, "customer": {"name": "Teste", "email": "teste@example.com", "document": "12345678901"}}' \
  | jq -e '.id' > /dev/null && echo "✅ Passou" || echo "❌ Falhou"

# Teste 2: Card Success
echo "2️⃣ Testando Cartão (aprovado)..."
curl -s -X POST $BASE_URL/payments \
  -H "X-API-Key: $API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "currency": "BRL", "payment_method": {"type": "credit_card", "card": {"number": "4111111111111111", "holder_name": "TESTE", "expiry_month": "12", "expiry_year": "2025", "cvv": "123"}}, "customer": {"name": "Teste", "email": "teste@example.com", "document": "12345678901"}}' \
  | jq -e '.id' > /dev/null && echo "✅ Passou" || echo "❌ Falhou"

# Teste 3: Card Declined
echo "3️⃣ Testando Cartão (recusado)..."
curl -s -X POST $BASE_URL/payments \
  -H "X-API-Key: $API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "currency": "BRL", "payment_method": {"type": "credit_card", "card": {"number": "4000000000000002", "holder_name": "TESTE", "expiry_month": "12", "expiry_year": "2025", "cvv": "123"}}, "customer": {"name": "Teste", "email": "teste@example.com", "document": "12345678901"}}' \
  | jq -e '.status == "failed"' > /dev/null && echo "✅ Passou" || echo "❌ Falhou"

echo "✅ Todos os testes concluídos!"
```

---

## Conclusão

Este plano cobre:
- ✅ Fluxos de sucesso (PIX, Cartão)
- ✅ Fluxos de falha
- ✅ Idempotência (sucesso e conflito)
- ✅ Webhooks (sucesso e retry)
- ✅ Payouts (sucesso e insuficiente)
- ✅ Simulação manual
- ✅ Limpeza de dados

Execute todos os cenários antes do lançamento!
