# Configuração de Roteamento da API TreexPay

## Problema Atual

Quando você acessa `https://treexpay.site/api/health`, está recebendo o HTML do frontend ao invés de JSON. Isso acontece porque:

1. **Seu site (SPA React)** está hospedado em `treexpay.site`
2. **Suas Edge Functions (API)** estão hospedadas no Supabase em `https://fhwfonispezljglrclia.supabase.co/functions/v1/`
3. **O roteamento** precisa ser configurado no servidor web para mapear `/api/*` para o Supabase

## Solução: Proxy Reverso

Para que `https://treexpay.site/api/v1/health` funcione, você precisa configurar um **proxy reverso** no seu servidor web.

### Teste Primeiro: Edge Function Funcionando

Antes de configurar o proxy, teste se a edge function está funcionando diretamente:

```bash
# Health check via Supabase direto
curl https://fhwfonispezljglrclia.supabase.co/functions/v1/api-health
```

Deve retornar:
```json
{
  "status": "ok",
  "service": "TreexPay API",
  "version": "1.0.0",
  "timestamp": "2025-01-10T..."
}
```

Se não funcionar, aguarde deploy automático das edge functions ou force deploy manualmente.

### Opção 1: Nginx (Recomendado)

Edite ou crie `/etc/nginx/sites-available/treexpay`:

```nginx
server {
    listen 443 ssl http2;
    server_name treexpay.site;

    ssl_certificate /etc/letsencrypt/live/treexpay.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/treexpay.site/privkey.pem;

    # Frontend (SPA React)
    location / {
        root /var/www/treexpay/dist;
        try_files $uri /index.html;
    }

    # API - Proxy para Supabase Edge Functions
    location /api/v1/ {
        proxy_pass https://fhwfonispezljglrclia.supabase.co/functions/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host fhwfonispezljglrclia.supabase.co;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers (se necessário)
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization, X-API-Key, Idempotency-Key';
        
        # Handle OPTIONS preflight
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name treexpay.site;
    return 301 https://$host$request_uri;
}
```

Ative e recarregue:
```bash
sudo ln -s /etc/nginx/sites-available/treexpay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Opção 2: Apache (.htaccess)

No diretório raiz do site, edite `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # API Proxy - Rewrite /api/v1/* para Supabase
  RewriteCond %{REQUEST_URI} ^/api/v1/(.*)$
  RewriteRule ^api/v1/(.*)$ https://fhwfonispezljglrclia.supabase.co/functions/v1/$1 [P,L]
  
  # SPA Fallback (para todas as outras rotas)
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Habilitar proxy (necessário mod_proxy)
<IfModule mod_proxy.c>
  ProxyRequests Off
  ProxyPreserveHost On
</IfModule>
```

**Importante**: Certifique-se de que `mod_proxy` e `mod_proxy_http` estão habilitados:
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl restart apache2
```

### Opção 3: Cloudflare Workers (Sem Acesso ao Servidor)

Se você usa Cloudflare e não tem acesso ao servidor, pode usar um Worker:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Se for /api/v1/*, redireciona para Supabase
  if (url.pathname.startsWith('/api/v1/')) {
    const supabaseUrl = url.pathname.replace(
      '/api/v1/',
      'https://fhwfonispezljglrclia.supabase.co/functions/v1/'
    )
    
    // Clona request com nova URL
    const modifiedRequest = new Request(supabaseUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
    
    return fetch(modifiedRequest)
  }
  
  // Caso contrário, deixa passar normalmente
  return fetch(request)
}
```

## Mapeamento de Endpoints

Após configurar o proxy, os endpoints ficarão assim:

| Frontend | Backend (via proxy) | Supabase Direto |
|----------|---------------------|-----------------|
| `/` | - | - |
| `/dashboard` | - | - |
| `/api/v1/health` | ✅ Proxy → Supabase | `functions/v1/api-health` |
| `/api/v1/payments` | ✅ Proxy → Supabase | `functions/v1/api-v1` (rota /payments) |
| `/api/v1/oauth/token` | ✅ Proxy → Supabase | `functions/v1/api-v1` (rota /oauth/token) |

## Subdomínio Dedicado (Opcional)

Se preferir usar `api.treexpay.site` ao invés de `treexpay.site/api/v1`:

### Passo 1: Criar registro DNS
```
Tipo: CNAME
Nome: api
Valor: fhwfonispezljglrclia.supabase.co (ou seu servidor)
TTL: 3600
```

### Passo 2: Configurar Supabase Custom Domain

No dashboard do Supabase:
1. Settings > API > Custom Domain
2. Adicionar `api.treexpay.site`
3. Seguir instruções de verificação

### Passo 3: Atualizar documentação

Trocar todas as URLs de:
- `https://treexpay.site/api/v1/` 
- Para: `https://api.treexpay.site/v1/`

## Testando

Após configurar o proxy:

```bash
# Health check
curl -i https://treexpay.site/api/v1/health

# Deve retornar:
HTTP/2 200
content-type: application/json
...

{
  "status": "ok",
  "service": "TreexPay API",
  "version": "1.0.0",
  "timestamp": "..."
}
```

## Prefixo Oficial Recomendado

**Recomendação**: Use `/api/v1/` no caminho principal

Razões:
- ✅ Mantém tudo no mesmo domínio (melhor para CORS)
- ✅ Versionamento explícito (`/v1/`, `/v2/` no futuro)
- ✅ Mais fácil de gerenciar certificados SSL
- ✅ Padrão da indústria (Google, Stripe, etc.)

**Alternativa**: Subdomínio `api.treexpay.site/v1/`
- ✅ Separação clara entre frontend e API
- ✅ Permite diferentes infraestruturas
- ⚠️ Requer configuração DNS adicional
- ⚠️ Mais complexo para CORS

## Checklist de Validação

- [ ] Edge function `api-health` testada diretamente no Supabase
- [ ] Proxy reverso configurado no servidor web
- [ ] `curl https://treexpay.site/api/v1/health` retorna JSON (não HTML)
- [ ] `curl https://treexpay.site/` continua retornando o SPA normalmente
- [ ] `curl https://treexpay.site/api/v1/rota-inexistente` retorna 404 JSON (não HTML)
- [ ] Certificados SSL válidos para o domínio
- [ ] CORS configurado nas edge functions
- [ ] Documentação atualizada com URLs reais

## Troubleshooting

### Ainda retorna HTML

1. Verifique se o proxy está ativo: `sudo nginx -t` ou `apachectl -t`
2. Verifique logs do servidor: `sudo tail -f /var/log/nginx/error.log`
3. Teste a edge function diretamente no Supabase
4. Verifique se o cache do navegador não está interferindo

### Erro 502 Bad Gateway

- Edge function não está deployada ou não está respondendo
- Verifique logs: Supabase Dashboard > Functions > Logs
- Teste deploy manual: `supabase functions deploy api-health`

### CORS blocked

- Adicione headers CORS no proxy (ver exemplos Nginx/Apache acima)
- Ou garanta que a edge function retorna headers CORS

## Onde Conectar o Backend na Lovable

Na Lovable com Supabase:

1. **Edge Functions** = Backend
   - Localização: `supabase/functions/`
   - Deploy: Automático ao publicar
   - URL: `https://SEU_PROJETO.supabase.co/functions/v1/`

2. **Criar Nova Function**:
   ```bash
   # Localmente (se tiver CLI)
   supabase functions new minha-funcao
   
   # Ou crie manualmente:
   # supabase/functions/minha-funcao/index.ts
   ```

3. **Conectar ao Frontend**:
   ```typescript
   // src/integrations/supabase/client.ts já configurado
   import { supabase } from '@/integrations/supabase/client';
   
   const { data, error } = await supabase.functions.invoke('api-health');
   ```

4. **Expor Publicamente** (sem auth):
   ```toml
   # supabase/config.toml
   [functions.api-health]
   verify_jwt = false
   ```

## Resumo

✅ **Criado**: Edge function `api-health` que retorna JSON  
✅ **Configuração**: Adicione proxy reverso no servidor (Nginx/Apache)  
✅ **Prefixo Recomendado**: `/api/v1/`  
✅ **Teste**: `https://fhwfonispezljglrclia.supabase.co/functions/v1/api-health` (direto)  
⏳ **Após Proxy**: `https://treexpay.site/api/v1/health` (via proxy)  

O próximo passo é configurar o proxy no servidor onde treexpay.site está hospedado.
