# Especificação de Webhooks

## Visão Geral

Webhooks permitem que você receba notificações em tempo real sobre eventos na sua conta. Quando um evento ocorre, fazemos uma requisição POST HTTPS para a URL configurada.

## Eventos Disponíveis

### Pagamentos

| Evento | Descrição | Quando dispara |
|--------|-----------|----------------|
| `payment.created` | Pagamento criado | Imediatamente após criação |
| `payment.processing` | Pagamento em processamento | Quando processamento inicia |
| `payment.paid` | Pagamento aprovado | Quando pagamento é confirmado |
| `payment.failed` | Pagamento falhou | Quando pagamento é negado |
| `payment.refunded` | Pagamento estornado | Quando estorno é processado |

### Payouts

| Evento | Descrição | Quando dispara |
|--------|-----------|----------------|
| `payout.created` | Saque criado | Quando saque é solicitado |
| `payout.processing` | Saque em processamento | Quando saque inicia processamento |
| `payout.completed` | Saque concluído | Quando valor é transferido |
| `payout.failed` | Saque falhou | Quando saque é negado |

### Reembolsos

| Evento | Descrição | Quando dispara |
|--------|-----------|----------------|
| `refund.created` | Reembolso criado | Quando reembolso é iniciado |
| `refund.completed` | Reembolso concluído | Quando reembolso é processado |

## Formato do Payload

Todos os webhooks seguem o mesmo formato de envelope:

```json
{
  "id": "evt_abc123xyz789",
  "type": "payment.paid",
  "created_at": "2025-01-10T14:30:00Z",
  "data": {
    "object": {
      // Dados do recurso (payment, payout, etc)
    }
  },
  "api_version": "1.0.0"
}
```

## Exemplos de Payloads

### payment.paid

```json
{
  "id": "evt_abc123xyz789",
  "type": "payment.paid",
  "created_at": "2025-01-10T14:30:15Z",
  "data": {
    "object": {
      "id": "pay_abc123xyz789",
      "status": "paid",
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
        "document": "12345678901"
      },
      "metadata": {
        "order_id": "ORD-12345"
      },
      "created_at": "2025-01-10T14:30:00Z",
      "updated_at": "2025-01-10T14:30:15Z"
    }
  },
  "api_version": "1.0.0"
}
```

### payment.failed

```json
{
  "id": "evt_def456ghi",
  "type": "payment.failed",
  "created_at": "2025-01-10T14:31:00Z",
  "data": {
    "object": {
      "id": "pay_def456ghi",
      "status": "failed",
      "amount": 5000,
      "currency": "BRL",
      "payment_method": {
        "type": "credit_card",
        "last4": "4242"
      },
      "failure_code": "card_declined",
      "failure_message": "Cartão recusado pelo banco emissor",
      "customer": {
        "name": "Maria Santos",
        "email": "maria@example.com"
      },
      "created_at": "2025-01-10T14:30:45Z",
      "updated_at": "2025-01-10T14:31:00Z"
    }
  },
  "api_version": "1.0.0"
}
```

### payout.completed

```json
{
  "id": "evt_pyt789xyz",
  "type": "payout.completed",
  "created_at": "2025-01-10T15:00:00Z",
  "data": {
    "object": {
      "id": "pyt_abc123xyz",
      "merchant_id": "mch_abc123",
      "amount": 100000,
      "status": "completed",
      "destination": {
        "type": "pix",
        "pix_key": "joao@example.com",
        "pix_key_type": "email"
      },
      "created_at": "2025-01-10T14:30:00Z",
      "completed_at": "2025-01-10T15:00:00Z"
    }
  },
  "api_version": "1.0.0"
}
```

## Assinatura HMAC SHA256

Todos os webhooks incluem um header `X-Signature` para validação:

```
X-Signature: sha256=5d41402abc4b2a76b9719d911017c592
```

### Como Validar

1. **Extrair o payload raw** (antes de parsear JSON)
2. **Obter o secret do webhook** (fornecido no registro)
3. **Calcular HMAC SHA256** do payload usando o secret
4. **Comparar** de forma timing-safe com a assinatura recebida

### Exemplo de Validação (Node.js)

```javascript
const crypto = require('crypto');

function validateWebhookSignature(payload, signature, secret) {
  // Payload deve ser string raw, não objeto parseado
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const expectedSignature = `sha256=${computedSignature}`;
  
  // Usar timing-safe compare
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Uso em Express
app.post('/webhooks/gateway', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-signature'];
  const secret = 'whsec_xyz789abc123'; // Do seu registro de webhook
  
  // req.body é Buffer quando usando express.raw()
  const isValid = validateWebhookSignature(req.body.toString(), signature, secret);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Assinatura inválida' });
  }
  
  // Parsear JSON apenas após validar
  const event = JSON.parse(req.body);
  
  // Processar evento
  handleWebhookEvent(event);
  
  res.status(200).json({ received: true });
});
```

### Exemplo de Validação (Python/Flask)

```python
import hmac
import hashlib

def validate_webhook_signature(payload, signature, secret):
    computed = hmac.new(
        secret.encode('utf8'),
        payload.encode('utf8'),
        hashlib.sha256
    ).hexdigest()
    
    expected = f"sha256={computed}"
    
    return hmac.compare_digest(signature, expected)

@app.route('/webhooks/gateway', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Signature')
    secret = 'whsec_xyz789abc123'
    
    # request.data é bytes raw
    is_valid = validate_webhook_signature(
        request.data.decode('utf8'),
        signature,
        secret
    )
    
    if not is_valid:
        return {'error': 'Assinatura inválida'}, 401
    
    event = request.json
    handle_webhook_event(event)
    
    return {'received': True}, 200
```

## Headers Enviados

```
POST /webhooks/gateway HTTP/1.1
Host: suaapi.com
Content-Type: application/json
X-Signature: sha256=5d41402abc4b2a76b9719d911017c592
X-Webhook-ID: evt_abc123xyz789
X-Webhook-Timestamp: 2025-01-10T14:30:15Z
User-Agent: GatewayWebhook/1.0
```

## Política de Retry

### Quando retentamos:
- Status codes: 500, 502, 503, 504 (erros do servidor)
- Timeouts (> 30 segundos)
- Erros de conexão

### Quando NÃO retentamos:
- Status codes: 200-299 (sucesso)
- Status codes: 400, 401, 403, 404, 409 (erros do cliente)

### Estratégia de Retry:

| Tentativa | Delay | Total Acumulado |
|-----------|-------|-----------------|
| 1 | Imediato | 0s |
| 2 | 30s | 30s |
| 3 | 2min | 2min 30s |
| 4 | 10min | 12min 30s |
| 5 | 1h | 1h 12min 30s |
| 6 | 6h | 7h 12min 30s |
| 7 | 24h | 31h 12min 30s |

Após 7 tentativas falhadas, o webhook é marcado como failed e você receberá uma notificação.

## Idempotência

É **CRÍTICO** que seu endpoint seja idempotente, pois o mesmo evento pode ser entregue múltiplas vezes (por retries).

### Boas Práticas:

1. **Usar o `id` do evento** para deduplicar:

```javascript
const processedEvents = new Set(); // Em produção, use Redis/DB

app.post('/webhooks/gateway', async (req, res) => {
  const event = req.body;
  
  // Verificar se já processamos este evento
  if (processedEvents.has(event.id)) {
    return res.status(200).json({ received: true, duplicate: true });
  }
  
  // Processar evento
  await handleEvent(event);
  
  // Marcar como processado
  processedEvents.add(event.id);
  
  res.status(200).json({ received: true });
});
```

2. **Usar transações de banco de dados** para garantir atomicidade:

```javascript
async function handlePaymentPaid(payment) {
  const transaction = await db.beginTransaction();
  
  try {
    // Verificar se já processamos
    const existing = await transaction
      .select()
      .from('webhook_events')
      .where({ event_id: payment.id })
      .first();
    
    if (existing) {
      await transaction.commit();
      return; // Já processado
    }
    
    // Processar pagamento
    await transaction
      .insert({
        order_id: payment.metadata.order_id,
        status: 'paid',
        amount: payment.amount
      })
      .into('orders');
    
    // Registrar evento processado
    await transaction
      .insert({ event_id: payment.id, processed_at: new Date() })
      .into('webhook_events');
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

## Timeout

Seu endpoint deve responder em **até 30 segundos**. Após esse tempo, consideramos timeout e reagendamos.

## Resposta Esperada

Basta retornar status 200-299 para confirmar recebimento:

```javascript
res.status(200).json({ received: true });
```

Qualquer dado no body é ignorado.

## Testando Webhooks

### 1. Usar Webhook.site

Para testes rápidos sem implementar endpoint:
```
URL: https://webhook.site/seu-uuid
```

### 2. Usar ngrok

Para testar localmente:
```bash
ngrok http 3000
# Use a URL gerada: https://abc123.ngrok.io/webhooks/gateway
```

### 3. Sandbox

No sandbox, eventos são disparados instantaneamente:
- PIX: pago imediatamente após criação
- Cartão: usa número do cartão para simular sucesso/falha
  - `4111111111111111`: sucesso
  - `4000000000000002`: falha (card_declined)

## Monitoramento

No dashboard, você pode:
- Ver logs de todos os webhooks enviados
- Status de cada tentativa
- Payload enviado e resposta recebida
- Reenviar webhooks manualmente
- Desabilitar webhooks temporariamente

## Segurança

1. ✅ **SEMPRE validar assinatura** antes de processar
2. ✅ Usar HTTPS no endpoint
3. ✅ Não expor URL do webhook publicamente
4. ✅ Implementar rate limiting no seu lado
5. ✅ Usar secret único e seguro (não reutilizar)
6. ✅ Rotacionar secrets periodicamente
7. ✅ Validar timestamp para prevenir replay attacks

## Proteção contra Replay Attacks

```javascript
function validateWebhookTimestamp(timestamp) {
  const now = Date.now();
  const eventTime = new Date(timestamp).getTime();
  const tolerance = 5 * 60 * 1000; // 5 minutos
  
  if (Math.abs(now - eventTime) > tolerance) {
    throw new Error('Timestamp muito antigo ou futuro');
  }
}

app.post('/webhooks/gateway', (req, res) => {
  const timestamp = req.headers['x-webhook-timestamp'];
  
  try {
    validateWebhookTimestamp(timestamp);
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
  
  // Continuar processamento...
});
```
