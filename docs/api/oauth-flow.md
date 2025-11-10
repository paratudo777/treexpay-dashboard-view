# Fluxo OAuth2 Authorization Code - TreexPay

## Visão Geral

O fluxo OAuth2 permite que lojistas autorizem sua aplicação a acessar recursos da TreexPay sem compartilhar credenciais.

## Passo 1: Redirecionar para Autorização

```
GET https://treexpay.site/api/v1/oauth/authorize
  ?client_id=app_abc123xyz
  &redirect_uri=https://suaaplicacao.com/callback
  &response_type=code
  &scope=payments:read payments:write balance:read payouts:write
  &state=random_state_string_xyz789
```

### Parâmetros:
- **client_id**: ID da sua aplicação (obtido no dashboard)
- **redirect_uri**: URL para onde o usuário será redirecionado após autorização
- **response_type**: Sempre `code`
- **scope**: Permissões solicitadas (separadas por espaço)
- **state**: String aleatória para prevenir CSRF (você deve validar no callback)

### Scopes Disponíveis:
- `payments:read` - Consultar pagamentos
- `payments:write` - Criar pagamentos
- `balance:read` - Consultar saldo
- `payouts:read` - Consultar saques
- `payouts:write` - Criar saques
- `webhooks:write` - Gerenciar webhooks
- `keys:write` - Gerenciar API keys

## Passo 2: Usuário Autoriza

O lojista será redirecionado para uma tela de autorização onde poderá:
1. Fazer login na conta da gateway (se não estiver logado)
2. Revisar as permissões solicitadas
3. Autorizar ou negar o acesso

## Passo 3: Receber Authorization Code

Após autorização, o usuário é redirecionado para sua `redirect_uri`:

```
https://suaaplicacao.com/callback
  ?code=AUTH_CODE_abc123xyz789
  &state=random_state_string_xyz789
```

**IMPORTANTE:** Valide que o `state` recebido é igual ao enviado.

## Passo 4: Trocar Code por Access Token

```bash
curl -X POST https://treexpay.site/api/v1/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE_abc123xyz789" \
  -d "client_id=app_abc123xyz" \
  -d "client_secret=secret_xyz789abc" \
  -d "redirect_uri=https://suaaplicacao.com/callback"
```

### Resposta de Sucesso:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_abc123xyz789",
  "scope": "payments:read payments:write balance:read payouts:write"
}
```

## Passo 5: Usar Access Token

```bash
curl https://treexpay.site/api/v1/payments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Renovar Token (Refresh)

Quando o access_token expirar, use o refresh_token:

```bash
curl -X POST https://treexpay.site/api/v1/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=refresh_abc123xyz789" \
  -d "client_id=app_abc123xyz" \
  -d "client_secret=secret_xyz789abc"
```

## Exemplo Completo (Node.js)

```javascript
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

const CLIENT_ID = 'app_abc123xyz';
const CLIENT_SECRET = 'secret_xyz789abc';
const REDIRECT_URI = 'http://localhost:3000/callback';

// Armazenar state temporariamente (em produção, use Redis/DB)
const stateStore = new Map();

// Passo 1: Iniciar OAuth
app.get('/connect', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, { timestamp: Date.now() });

  const authUrl = new URL('https://treexpay.site/api/v1/oauth/authorize');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'payments:read payments:write balance:read payouts:write');
  authUrl.searchParams.set('state', state);

  res.redirect(authUrl.toString());
});

// Passo 2: Callback
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validar state
  if (!stateStore.has(state)) {
    return res.status(400).send('State inválido');
  }
  stateStore.delete(state);

  // Trocar code por token
  try {
    const response = await axios.post('https://treexpay.site/api/v1/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Salvar tokens no banco de dados associado ao merchant
    // saveTokens(merchantId, access_token, refresh_token, expires_in);

    res.send('Autorização concluída! Tokens salvos.');
  } catch (error) {
    console.error('Erro ao trocar code:', error.response?.data);
    res.status(500).send('Erro na autorização');
  }
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));
```

## Segurança

1. **HTTPS Obrigatório**: Sempre use HTTPS em produção
2. **Validar State**: Previne ataques CSRF
3. **Client Secret Seguro**: Nunca exponha em código frontend
4. **Token Storage**: Armazene tokens de forma segura (criptografados)
5. **Scope Mínimo**: Solicite apenas as permissões necessárias
6. **Token Rotation**: Implemente refresh token rotation
