# Códigos de Erro e Respostas Padronizadas

## Formato Padrão de Erro

Todas as respostas de erro seguem o mesmo formato:

```json
{
  "code": "ERROR_CODE",
  "message": "Mensagem legível para humanos",
  "details": {
    "field": "nome_do_campo",
    "additional_info": "informação adicional"
  }
}
```

## HTTP Status Codes

| Status | Significado | Quando Usar |
|--------|-------------|-------------|
| 200 | OK | Requisição bem-sucedida (GET, PUT, DELETE) |
| 201 | Created | Recurso criado (POST) |
| 204 | No Content | Sucesso sem corpo (DELETE) |
| 400 | Bad Request | Payload inválido, campo obrigatório faltando |
| 401 | Unauthorized | Token ausente, inválido ou expirado |
| 403 | Forbidden | Token válido mas sem permissão |
| 404 | Not Found | Recurso não existe |
| 409 | Conflict | Conflito de estado (ex: Idempotency-Key reutilizada) |
| 422 | Unprocessable Entity | Dados válidos mas não processáveis (ex: saldo insuficiente) |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Erro no servidor |
| 502 | Bad Gateway | Serviço externo indisponível |
| 503 | Service Unavailable | Manutenção programada |
| 504 | Gateway Timeout | Timeout em serviço externo |

## Códigos de Erro Detalhados

### Autenticação (401)

#### UNAUTHORIZED
```json
{
  "code": "UNAUTHORIZED",
  "message": "Token de autenticação não fornecido"
}
```

#### INVALID_TOKEN
```json
{
  "code": "INVALID_TOKEN",
  "message": "Token inválido ou mal formatado"
}
```

#### EXPIRED_TOKEN
```json
{
  "code": "EXPIRED_TOKEN",
  "message": "Token expirado",
  "details": {
    "expired_at": "2025-01-10T14:30:00Z"
  }
}
```

#### REVOKED_TOKEN
```json
{
  "code": "REVOKED_TOKEN",
  "message": "Token foi revogado"
}
```

### Autorização (403)

#### FORBIDDEN
```json
{
  "code": "FORBIDDEN",
  "message": "Sem permissão para acessar este recurso"
}
```

#### INSUFFICIENT_SCOPE
```json
{
  "code": "INSUFFICIENT_SCOPE",
  "message": "Scope insuficiente para esta operação",
  "details": {
    "required_scope": "payments:write",
    "current_scopes": ["payments:read"]
  }
}
```

### Validação (400)

#### INVALID_REQUEST
```json
{
  "code": "INVALID_REQUEST",
  "message": "Requisição inválida",
  "details": {
    "errors": [
      {
        "field": "amount",
        "message": "Campo obrigatório"
      }
    ]
  }
}
```

#### INVALID_FIELD
```json
{
  "code": "INVALID_FIELD",
  "message": "Campo 'email' inválido",
  "details": {
    "field": "customer.email",
    "value": "email_invalido",
    "expected": "Endereço de email válido"
  }
}
```

#### INVALID_AMOUNT
```json
{
  "code": "INVALID_AMOUNT",
  "message": "Valor deve ser maior que zero",
  "details": {
    "field": "amount",
    "value": 0,
    "min": 1
  }
}
```

#### INVALID_CARD
```json
{
  "code": "INVALID_CARD",
  "message": "Número de cartão inválido",
  "details": {
    "field": "payment_method.card.number",
    "reason": "Falha na validação de Luhn"
  }
}
```

#### INVALID_CPF
```json
{
  "code": "INVALID_CPF",
  "message": "CPF inválido",
  "details": {
    "field": "customer.document",
    "value": "12345678901"
  }
}
```

### Não Encontrado (404)

#### NOT_FOUND
```json
{
  "code": "NOT_FOUND",
  "message": "Pagamento não encontrado",
  "details": {
    "resource_type": "payment",
    "resource_id": "pay_abc123xyz"
  }
}
```

### Conflito (409)

#### IDEMPOTENCY_CONFLICT
```json
{
  "code": "IDEMPOTENCY_CONFLICT",
  "message": "Idempotency-Key já utilizada com payload diferente",
  "details": {
    "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
    "original_request": {
      "created_at": "2025-01-10T14:30:00Z",
      "status": 201
    }
  }
}
```

#### DUPLICATE_RESOURCE
```json
{
  "code": "DUPLICATE_RESOURCE",
  "message": "Webhook com esta URL já existe",
  "details": {
    "url": "https://loja.com/webhook",
    "existing_id": "whk_abc123"
  }
}
```

### Lógica de Negócio (422)

#### INSUFFICIENT_BALANCE
```json
{
  "code": "INSUFFICIENT_BALANCE",
  "message": "Saldo insuficiente para realizar payout",
  "details": {
    "available": 50000,
    "requested": 100000,
    "currency": "BRL"
  }
}
```

#### PAYMENT_FAILED
```json
{
  "code": "PAYMENT_FAILED",
  "message": "Pagamento recusado pelo banco emissor",
  "details": {
    "decline_code": "card_declined",
    "decline_message": "Transação não autorizada"
  }
}
```

#### KYC_REQUIRED
```json
{
  "code": "KYC_REQUIRED",
  "message": "KYC incompleto. Complete a verificação para habilitar payouts",
  "details": {
    "kyc_status": "pending",
    "missing_documents": ["proof_of_address", "selfie"]
  }
}
```

#### LIMIT_EXCEEDED
```json
{
  "code": "LIMIT_EXCEEDED",
  "message": "Limite de payout excedido",
  "details": {
    "limit": 100000,
    "requested": 150000,
    "reason": "KYC incompleto"
  }
}
```

#### MERCHANT_SUSPENDED
```json
{
  "code": "MERCHANT_SUSPENDED",
  "message": "Conta suspensa por violação dos termos de uso"
}
```

### Rate Limiting (429)

#### RATE_LIMITED
```json
{
  "code": "RATE_LIMITED",
  "message": "Limite de requisições excedido",
  "details": {
    "limit": 60,
    "window": "1 minuto",
    "retry_after": 45
  }
}
```

Headers incluídos:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1641816045
Retry-After: 45
```

### Erros do Servidor (500+)

#### INTERNAL_ERROR
```json
{
  "code": "INTERNAL_ERROR",
  "message": "Erro interno do servidor",
  "details": {
    "request_id": "req_abc123xyz",
    "timestamp": "2025-01-10T14:30:00Z"
  }
}
```

#### SERVICE_UNAVAILABLE
```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Serviço temporariamente indisponível",
  "details": {
    "retry_after": 300,
    "reason": "Manutenção programada"
  }
}
```

#### GATEWAY_TIMEOUT
```json
{
  "code": "GATEWAY_TIMEOUT",
  "message": "Timeout ao processar pagamento",
  "details": {
    "timeout": "30s",
    "suggestion": "Consultar status do pagamento em alguns segundos"
  }
}
```

### Erros de Pagamento Específicos

#### CARD_DECLINED
```json
{
  "code": "CARD_DECLINED",
  "message": "Cartão recusado",
  "details": {
    "decline_code": "insufficient_funds",
    "suggestion": "Solicitar outro método de pagamento"
  }
}
```

#### EXPIRED_CARD
```json
{
  "code": "EXPIRED_CARD",
  "message": "Cartão expirado"
}
```

#### INVALID_CVC
```json
{
  "code": "INVALID_CVC",
  "message": "CVV inválido"
}
```

#### LOST_CARD
```json
{
  "code": "LOST_CARD",
  "message": "Cartão reportado como perdido"
}
```

#### STOLEN_CARD
```json
{
  "code": "STOLEN_CARD",
  "message": "Cartão reportado como roubado"
}
```

#### FRAUD_SUSPECTED
```json
{
  "code": "FRAUD_SUSPECTED",
  "message": "Transação bloqueada por suspeita de fraude"
}
```

## Tratamento de Erros - Boas Práticas

### 1. Sempre Verificar Status Code

```javascript
const response = await fetch('https://api.gateway.com/v1/payments', {
  method: 'POST',
  headers: {
    'X-API-Key': 'sk_live_abc123',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payment)
});

if (!response.ok) {
  const error = await response.json();
  console.error('Erro:', error.code, error.message);
  
  // Tratar erro específico
  switch (error.code) {
    case 'INSUFFICIENT_BALANCE':
      alert('Saldo insuficiente para payout');
      break;
    case 'CARD_DECLINED':
      alert('Cartão recusado. Tente outro método.');
      break;
    case 'RATE_LIMITED':
      // Aguardar e tentar novamente
      setTimeout(() => retry(), error.details.retry_after * 1000);
      break;
    default:
      alert('Erro ao processar pagamento');
  }
  
  return;
}

const payment = await response.json();
```

### 2. Implementar Retry para Erros Temporários

Retente automaticamente para:
- 500, 502, 503, 504 (erros do servidor)
- 429 (rate limited - após esperar)

**NÃO** retente para:
- 400, 401, 403, 404, 409, 422 (erros do cliente)

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    // Sucesso
    if (response.ok) {
      return await response.json();
    }
    
    // Erro do cliente - não retente
    if (response.status < 500 && response.status !== 429) {
      throw await response.json();
    }
    
    // Erro do servidor ou rate limit - retente
    if (i < maxRetries - 1) {
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### 3. Logar Erros com Contexto

```javascript
try {
  const payment = await createPayment(data);
} catch (error) {
  console.error('Falha ao criar pagamento', {
    error_code: error.code,
    error_message: error.message,
    merchant_id: merchantId,
    amount: data.amount,
    request_id: error.details?.request_id,
    timestamp: new Date().toISOString()
  });
  
  // Enviar para sistema de monitoramento
  sendToSentry(error);
}
```

### 4. Mostrar Mensagens Amigáveis

```javascript
const ERROR_MESSAGES = {
  CARD_DECLINED: 'Seu cartão foi recusado. Verifique os dados ou tente outro cartão.',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente para esta operação.',
  INVALID_CARD: 'Número do cartão inválido. Verifique e tente novamente.',
  EXPIRED_CARD: 'Cartão expirado. Use um cartão válido.',
  RATE_LIMITED: 'Muitas requisições. Aguarde alguns segundos.',
  INTERNAL_ERROR: 'Erro temporário. Tente novamente em instantes.'
};

function getUserFriendlyMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || 'Erro ao processar. Tente novamente.';
}
```

## Debugging

Todos os erros 500+ incluem um `request_id` que pode ser usado para debugging:

```json
{
  "code": "INTERNAL_ERROR",
  "message": "Erro interno do servidor",
  "details": {
    "request_id": "req_abc123xyz789"
  }
}
```

Ao contatar o suporte, forneça o `request_id` para investigação rápida.
