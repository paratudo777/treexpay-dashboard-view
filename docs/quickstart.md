# Quickstart - Integração Gateway de Pagamentos

Guia rápido para lojistas integrarem a gateway e começarem a receber pagamentos.

## 1. Criar Conta e Aplicação

1. Acesse [dashboard.gateway.com](https://dashboard.gateway.com)
2. Crie sua conta
3. Complete o KYC (envie documentos)
4. Crie uma aplicação em **Configurações > Aplicações**
5. Anote seu `client_id` e `client_secret`

## 2. Escolher Método de Autenticação

### Opção A: OAuth2 (Recomendado para Plataformas)

Se você está construindo uma plataforma onde múltiplos lojistas vão se conectar:

```javascript
// 1. Redirecionar lojista para autorização
const authUrl = `https://api.gateway.com/oauth/authorize?client_id=SEU_CLIENT_ID&redirect_uri=https://suaapp.com/callback&response_type=code&scope=payments:read payments:write balance:read payouts:write&state=RANDOM_STATE`;

// 2. Após autorização, receber code e trocar por token
const response = await fetch('https://api.gateway.com/v1/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: 'CODE_RECEBIDO',
    client_id: 'SEU_CLIENT_ID',
    client_secret: 'SEU_CLIENT_SECRET',
    redirect_uri: 'https://suaapp.com/callback'
  })
});

const { access_token } = await response.json();
// Salvar access_token para usar nas requisições
```

### Opção B: API Key (Simples para Server-to-Server)

Se é apenas sua loja conectando:

1. No dashboard, vá em **Configurações > API Keys**
2. Clique em **Criar Nova Chave**
3. Dê um nome (ex: "Servidor Produção")
4. Copie a chave (mostrada apenas uma vez!)

## 3. Criar Primeiro Pagamento

### Com PIX (mais simples):

```bash
curl -X POST https://api.gateway.com/v1/payments \
  -H "X-API-Key: sk_live_SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount": 10000,
    "currency": "BRL",
    "payment_method": {
      "type": "pix"
    },
    "customer": {
      "name": "Cliente Teste",
      "email": "cliente@example.com",
      "document": "12345678901"
    },
    "metadata": {
      "order_id": "PED-12345"
    }
  }'
```

**Resposta:**
```json
{
  "id": "pay_abc123xyz",
  "status": "created",
  "amount": 10000,
  "payment_method": {
    "type": "pix",
    "pix": {
      "qr_code": "00020126580014br.gov.bcb.pix...",
      "qr_code_url": "https://api.gateway.com/qr/pay_abc123xyz.png",
      "expiration": "2025-01-10T15:30:00Z"
    }
  }
}
```

**Mostrar QR Code para cliente:**
- Exibir `qr_code_url` como imagem
- Ou gerar QR Code do `qr_code` no frontend

### Com Cartão de Crédito:

```bash
curl -X POST https://api.gateway.com/v1/payments \
  -H "X-API-Key: sk_live_SUA_API_KEY" \
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
      "document": "12345678901"
    }
  }'
```

## 4. Receber Notificações (Webhooks)

### Registrar Webhook:

```bash
curl -X POST https://api.gateway.com/v1/webhooks \
  -H "X-API-Key: sk_live_SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://suaapi.com/webhooks/gateway",
    "events": [
      "payment.paid",
      "payment.failed"
    ]
  }'
```

**Resposta:**
```json
{
  "id": "whk_abc123",
  "url": "https://suaapi.com/webhooks/gateway",
  "secret": "whsec_xyz789abc",
  "events": ["payment.paid", "payment.failed"]
}
```

**IMPORTANTE:** Guarde o `secret` para validar webhooks!

### Implementar Endpoint de Webhook:

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

// IMPORTANTE: Usar express.raw() para ter acesso ao body original
app.post('/webhooks/gateway', 
  express.raw({ type: 'application/json' }), 
  (req, res) => {
    // 1. Validar assinatura
    const signature = req.headers['x-signature'];
    const secret = 'whsec_xyz789abc'; // Do registro de webhook
    
    const computed = crypto
      .createHmac('sha256', secret)
      .update(req.body) // Body raw (Buffer)
      .digest('hex');
    
    const expected = `sha256=${computed}`;
    
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
    
    // 2. Parsear evento
    const event = JSON.parse(req.body);
    
    // 3. Processar evento
    if (event.type === 'payment.paid') {
      const payment = event.data.object;
      console.log('Pagamento confirmado:', payment.id);
      console.log('Pedido:', payment.metadata.order_id);
      
      // Liberar produto, enviar email, etc
      liberarProduto(payment.metadata.order_id);
    }
    
    // 4. Confirmar recebimento
    res.status(200).json({ received: true });
  }
);

app.listen(3000);
```

## 5. Consultar Saldo

```bash
curl https://api.gateway.com/v1/merchants/SEU_MERCHANT_ID/balance \
  -H "X-API-Key: sk_live_SUA_API_KEY"
```

**Resposta:**
```json
{
  "available": 150000,
  "pending": 25000,
  "total": 175000,
  "currency": "BRL"
}
```

- **available**: R$ 1.500,00 (disponível para saque)
- **pending**: R$ 250,00 (em retenção - cartão)
- **total**: R$ 1.750,00

## 6. Solicitar Saque (Payout)

```bash
curl -X POST https://api.gateway.com/v1/merchants/SEU_MERCHANT_ID/payouts \
  -H "X-API-Key: sk_live_SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "amount": 100000,
    "destination": {
      "type": "pix",
      "pix_key": "seuemail@example.com",
      "pix_key_type": "email"
    }
  }'
```

**Resposta:**
```json
{
  "id": "pyt_abc123",
  "status": "pending",
  "amount": 100000,
  "created_at": "2025-01-10T14:30:00Z"
}
```

Você receberá um webhook `payout.completed` quando o saque for processado.

## Testando no Sandbox

Para testar sem cobranças reais:

1. Use `https://sandbox.gateway.com` ao invés de `https://api.gateway.com`
2. Use API keys de sandbox (começam com `sk_test_`)
3. No sandbox:
   - PIX é confirmado instantaneamente
   - Cartões de teste:
     - `4111111111111111`: sucesso
     - `4000000000000002`: falha (card_declined)

## Próximos Passos

✅ Implementar tratamento de erros  
✅ Adicionar logs de auditoria  
✅ Testar cenários de falha  
✅ Configurar monitoramento de webhooks  
✅ Implementar retry para webhooks falhados  
✅ Adicionar boleto como método de pagamento  

## Suporte

- **Documentação completa**: [docs.gateway.com](https://docs.gateway.com)
- **Dashboard**: [dashboard.gateway.com](https://dashboard.gateway.com)
- **Suporte**: suporte@gateway.com
- **Status da API**: [status.gateway.com](https://status.gateway.com)

## Checklist de Go-Live

Antes de ir para produção:

- [ ] KYC aprovado
- [ ] Webhooks configurados e testados
- [ ] Validação de assinatura implementada
- [ ] Idempotência implementada
- [ ] Tratamento de erros completo
- [ ] Logs implementados
- [ ] Monitoramento configurado
- [ ] Testado no sandbox
- [ ] Chaves de produção geradas
- [ ] HTTPS configurado
- [ ] Política de privacidade atualizada
