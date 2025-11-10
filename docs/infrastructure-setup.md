# Guia de Configuração de Infraestrutura - TreexPay API

## Resumo

Para que a API TreexPay funcione nos domínios:
- **Produção**: `https://treexpay.site/api/v1`
- **Sandbox**: `https://sandbox.treexpay.site/api/v1`

Você precisa configurar subdomínios, DNS, proxy reverso e certificados SSL.

---

## 1. Criar Subdomínio Sandbox

### O que fazer:
Configurar o subdomínio `sandbox.treexpay.site` apontando para o mesmo servidor (ou servidor de sandbox).

### Passos (no seu provedor de domínio):

1. Acesse o painel de DNS do seu provedor (ex.: Registro.br, GoDaddy, Cloudflare)
2. Adicione um registro DNS do tipo **A** ou **CNAME**:
   - **Nome**: `sandbox`
   - **Tipo**: A (se você tem IP fixo) ou CNAME (se aponta para outro domínio)
   - **Valor**: 
     - Se A: o IP do servidor (ex.: `203.0.113.42`)
     - Se CNAME: o hostname do servidor (ex.: `treexpay.site` ou `servidor.treexpay.site`)
   - **TTL**: 3600 (ou padrão)

3. Salve e aguarde propagação (pode levar até 24h, mas geralmente é rápido)

---

## 2. Configurar Certificados SSL (HTTPS)

### O que fazer:
Garantir que tanto `treexpay.site` quanto `sandbox.treexpay.site` tenham certificados SSL válidos.

### Opção A: Cloudflare (Recomendado - Grátis)

1. Adicione seu domínio no Cloudflare
2. Aponte os nameservers do domínio para Cloudflare
3. Cloudflare emitirá certificados SSL automaticamente para:
   - `treexpay.site`
   - `*.treexpay.site` (inclui sandbox)
4. Ative **SSL Full** ou **SSL Full (Strict)** no painel

### Opção B: Let's Encrypt (Manual/Certbot)

No servidor Linux/Ubuntu:

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificados para ambos domínios
sudo certbot --nginx -d treexpay.site -d sandbox.treexpay.site

# Certificados serão salvos automaticamente e renovados a cada 90 dias
```

---

## 3. Configurar Proxy Reverso (Nginx ou Apache)

### Cenário Comum:
- Seu backend (Supabase Edge Functions ou servidor Node.js/Python) roda internamente em `localhost:3000` ou similar
- Você precisa mapear:
  - `https://treexpay.site/api/v1/*` → Backend Produção
  - `https://sandbox.treexpay.site/api/v1/*` → Backend Sandbox

### Exemplo Nginx:

Crie/edite o arquivo `/etc/nginx/sites-available/treexpay`:

```nginx
# Produção
server {
    listen 443 ssl http2;
    server_name treexpay.site;

    ssl_certificate /etc/letsencrypt/live/treexpay.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/treexpay.site/privkey.pem;

    # Proxy para painel (React/Frontend)
    location / {
        root /var/www/treexpay/build;
        try_files $uri /index.html;
    }

    # Proxy para API backend
    location /api/v1/ {
        proxy_pass http://localhost:3000/v1/;  # Seu backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Sandbox
server {
    listen 443 ssl http2;
    server_name sandbox.treexpay.site;

    ssl_certificate /etc/letsencrypt/live/treexpay.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/treexpay.site/privkey.pem;

    # Proxy para API sandbox
    location /api/v1/ {
        proxy_pass http://localhost:4000/v1/;  # Backend sandbox
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name treexpay.site sandbox.treexpay.site;
    return 301 https://$host$request_uri;
}
```

### Ativar configuração:

```bash
sudo ln -s /etc/nginx/sites-available/treexpay /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

---

## 4. Se Usar Supabase Edge Functions

Se sua API for baseada em Supabase Edge Functions, você tem duas opções:

### Opção A: Proxy Direto para Supabase
```nginx
location /api/v1/ {
    proxy_pass https://SEU_PROJETO.supabase.co/functions/v1/;
    # ... outros headers
}
```

### Opção B: Custom Domain no Supabase (Recomendado)

1. No painel Supabase, vá em **Settings > API**
2. Configure custom domain: `api.treexpay.site`
3. Supabase fornecerá um registro CNAME
4. Adicione esse CNAME no seu DNS
5. Use `https://api.treexpay.site/functions/v1/` como base

---

## 5. Testar Configuração

### Teste 1: DNS Propagado
```bash
# Deve retornar o IP correto
nslookup sandbox.treexpay.site

# Deve mostrar certificado válido
curl -I https://sandbox.treexpay.site
```

### Teste 2: Health Check
```bash
# Produção
curl https://treexpay.site/api/v1/health

# Sandbox
curl https://sandbox.treexpay.site/api/v1/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-01-10T14:30:00Z"
}
```

### Teste 3: HTTPS Válido
Abra no navegador:
- `https://treexpay.site` → Deve mostrar cadeado verde
- `https://sandbox.treexpay.site` → Deve mostrar cadeado verde

---

## 6. Checklist Final

- [ ] DNS configurado para `sandbox.treexpay.site`
- [ ] Certificados SSL válidos para ambos domínios
- [ ] Nginx/Apache configurado com proxy reverso
- [ ] Backend rodando em `localhost:3000` (produção) e `localhost:4000` (sandbox)
- [ ] Health check retorna 200 OK
- [ ] HTTPS funcionando sem erros de certificado
- [ ] CORS configurado no backend para aceitar requests de `https://treexpay.site`
- [ ] Documentação atualizada com URLs reais

---

## 7. Troubleshooting

### Erro: "DNS não resolve"
- Verifique se o registro A/CNAME está correto
- Aguarde até 24h para propagação completa
- Use `nslookup sandbox.treexpay.site` para verificar

### Erro: "Certificado SSL inválido"
- Rode `sudo certbot renew` para renovar certificados
- Verifique se o Nginx está usando os certificados corretos
- Reinicie Nginx: `sudo systemctl restart nginx`

### Erro: "502 Bad Gateway"
- Backend não está rodando → Inicie o serviço
- Porta errada no proxy_pass → Verifique a porta do backend
- Firewall bloqueando → Libere porta 3000/4000

### Erro: "CORS blocked"
- Configure headers CORS no backend:
```javascript
res.setHeader('Access-Control-Allow-Origin', 'https://treexpay.site');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

---

## 8. Próximos Passos

Após configuração completa:
1. Atualize toda documentação com URLs reais
2. Teste todos os endpoints com Postman/Insomnia
3. Configure monitoramento (Uptime Robot, Pingdom)
4. Configure alertas para downtime
5. Documente processo de deploy

---

## Contato

Se precisar de ajuda com a configuração, contate seu provedor de hospedagem com este documento.
