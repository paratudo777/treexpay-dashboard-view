# Checklist de Segurança e Compliance

## 1. Transporte e Criptografia

- [x] **TLS 1.2+**: Todas as conexões usam TLS 1.2 ou superior
- [x] **HTTPS Obrigatório**: Rejeitar qualquer requisição HTTP
- [x] **HSTS Header**: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [x] **Certificate Pinning**: Considerar para clientes móveis
- [x] **Dados sensíveis criptografados at-rest**: Números de cartão, senhas, secrets

## 2. Autenticação e Autorização

- [x] **OAuth2 + JWT**: Tokens com expiração curta (1h)
- [x] **Refresh Token Rotation**: Renovar refresh tokens a cada uso
- [x] **API Keys Hasheadas**: Armazenar apenas hash SHA-256
- [x] **Scopes Granulares**: Permissões específicas por operação
- [x] **Rate Limiting por Usuário**: 60 req/min por API key
- [x] **Revogação de Tokens**: Capacidade de invalidar imediatamente
- [x] **MFA Opcional**: Autenticação de dois fatores para admin

## 3. Validação de Dados

- [x] **Validação Estrita**: Rejeitar payloads com campos extras
- [x] **Sanitização**: Escapar HTML/SQL em todos os inputs
- [x] **Limites de Tamanho**: Max 1MB por requisição
- [x] **Content-Type Validation**: Aceitar apenas application/json
- [x] **CPF/CNPJ Validation**: Validar algoritmicamente
- [x] **Email Validation**: Regex + verificação de domínio
- [x] **Card Validation**: Luhn check + BIN validation
- [x] **Monetary Amounts**: Sempre inteiros (centavos), nunca floats

## 4. Proteção contra Ataques

### SQL Injection
- [x] **Prepared Statements**: Sempre usar parametrização
- [x] **ORM Usage**: Evitar raw queries

### XSS (Cross-Site Scripting)
- [x] **Sanitização de Outputs**: Escapar dados em respostas
- [x] **CSP Headers**: `Content-Security-Policy` configurado
- [x] **JSON Response**: Nunca executar como script

### CSRF (Cross-Site Request Forgery)
- [x] **State Parameter**: Em OAuth2 flows
- [x] **SameSite Cookies**: `SameSite=Strict` ou `Lax`

### Replay Attacks
- [x] **Idempotency Keys**: Obrigatórios em operações críticas
- [x] **Timestamp Validation**: Rejeitar requisições > 5min antigas
- [x] **Nonce Usage**: Em webhooks e callbacks

### DDoS
- [x] **Rate Limiting Global**: 10k req/min por IP
- [x] **WAF**: Web Application Firewall configurado
- [x] **Circuit Breaker**: Desabilitar endpoints sob ataque

### Brute Force
- [x] **Login Throttling**: Aumentar delay após falhas
- [x] **Account Lockout**: Bloquear após 5 tentativas
- [x] **CAPTCHA**: Após 3 tentativas falhadas

## 5. Segurança de Webhooks

- [x] **HMAC SHA256**: Assinar todos os webhooks
- [x] **Secret Único**: Um secret por merchant
- [x] **Timestamp Check**: Rejeitar webhooks > 5min antigos
- [x] **Retry Logic**: Backoff exponencial
- [x] **Timeout**: 30s max por webhook
- [x] **HTTPS Only**: Rejeitar URLs HTTP

## 6. Logging e Monitoramento

### O que Logar
- [x] Todas as autenticações (sucesso e falha)
- [x] Mudanças de saldo
- [x] Criação/revogação de API keys
- [x] Payouts criados/processados
- [x] Falhas de webhook
- [x] Rate limiting ativado
- [x] Erros 500

### O que NÃO Logar
- [ ] ~~Números de cartão completos~~
- [ ] ~~CVV~~
- [ ] ~~Senhas~~
- [ ] ~~API Keys/Secrets completos~~
- [ ] ~~Access/Refresh Tokens~~

### Formato de Logs
```json
{
  "timestamp": "2025-01-10T14:30:00Z",
  "level": "INFO",
  "event": "payment.created",
  "merchant_id": "mch_abc123",
  "payment_id": "pay_xyz789",
  "amount": 10000,
  "payment_method": "pix",
  "ip": "203.0.113.42",
  "user_agent": "Gateway-SDK/1.0"
}
```

## 7. Compliance e Regulamentação

### PCI DSS (Cartões)
- [x] **Não armazenar CVV**: Nunca salvar depois da transação
- [x] **Tokenização**: Usar tokens ao invés de números reais
- [x] **Criptografia**: AES-256 para dados de cartão
- [x] **Audit Trail**: Logs de todas as operações com cartão
- [x] **Testes de Penetração**: Anualmente

### LGPD (Lei Geral de Proteção de Dados)
- [x] **Consentimento Explícito**: Para armazenar dados
- [x] **Direito ao Esquecimento**: Endpoint para deletar dados
- [x] **Portabilidade**: Exportar dados em formato legível
- [x] **DPO Designado**: Data Protection Officer
- [x] **Política de Privacidade**: Clara e acessível
- [x] **Relatório de Incidentes**: Notificar ANPD em até 72h

### Anti-Lavagem de Dinheiro (AML)
- [x] **KYC Obrigatório**: Antes de habilitar payouts
- [x] **Limites de Transação**: Monitorar valores altos
- [x] **Velocity Checks**: Detectar padrões suspeitos
- [x] **Blacklist Check**: CPF/CNPJ em listas negras
- [x] **Relatórios COAF**: Transações suspeitas

## 8. KYC (Know Your Customer)

### Documentos Mínimos
- [x] CPF/CNPJ
- [x] Comprovante de endereço
- [x] Selfie com documento (liveness check)
- [x] Dados bancários para payout

### Níveis de Verificação
1. **Básico**: Email verificado
   - Limite: R$ 1.000/mês
   - Sem payouts
   
2. **Intermediário**: CPF + Selfie
   - Limite: R$ 10.000/mês
   - Payouts até R$ 1.000

3. **Completo**: Todos os documentos
   - Sem limite
   - Payouts ilimitados

## 9. Fraude e Chargebacks

### Prevenção
- [x] **3DS (3D Secure)**: Autenticação adicional para cartões
- [x] **Device Fingerprint**: Identificar dispositivos suspeitos
- [x] **Geolocalização**: Verificar IP vs. localização do cartão
- [x] **Velocity Rules**: Limitar transações por tempo
- [x] **Blacklist**: IPs, emails, cartões bloqueados
- [x] **Machine Learning**: Scoring de risco em tempo real

### Retenção para Chargebacks
- **PIX**: Sem retenção (sem chargeback)
- **Boleto**: Sem retenção (sem chargeback)
- **Cartão**: 30 dias de retenção

### Processo de Chargeback
1. Cliente contesta no banco
2. Banco notifica gateway
3. Gateway notifica merchant (webhook `chargeback.created`)
4. Merchant tem 7 dias para contestar
5. Se confirmado, debitar do saldo available

## 10. Limites e Rate Limiting

### Rate Limits Padrão
- **Global**: 10.000 req/min por IP
- **Por API Key**: 60 req/min
- **OAuth Token**: 100 req/min
- **Webhook Delivery**: 10/segundo por merchant

### Headers de Rate Limit
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1641816000
```

### Limites Financeiros
- **Payout Mínimo**: R$ 10,00
- **Payout Máximo**: R$ 100.000 (sem KYC completo)
- **Transação Máxima**: R$ 50.000
- **Retenção Chargeback**: 10% do volume mensal

## 11. Observabilidade

### Métricas Críticas
- Requests/segundo
- Success rate (%)
- Latência p50, p95, p99
- Error rate 4xx, 5xx
- Webhook success rate
- Payment approval rate
- Fraud detection rate

### Alertas
- [ ] Error rate > 5%
- [ ] Latency p99 > 2s
- [ ] Webhook failure > 10%
- [ ] Fraud rate > 2%
- [ ] API downtime > 1min

### Dashboards
- Tempo real: requests, latency, errors
- Financeiro: volume, fees, chargebacks
- Segurança: falhas de auth, rate limits, fraudes

## 12. Disaster Recovery

- [x] **Backups Diários**: Banco de dados criptografado
- [x] **Point-in-Time Recovery**: Últimas 30 dias
- [x] **Multi-Region**: Deploy em múltiplas regiões
- [x] **Failover Automático**: < 5min downtime
- [x] **DR Testing**: Trimestral

## 13. Testes de Segurança

- [x] **Penetration Testing**: Anual por empresa especializada
- [x] **Vulnerability Scanning**: Semanal automatizado
- [x] **Dependency Audit**: Diário (npm audit, Snyk)
- [x] **SAST/DAST**: CI/CD pipeline
- [x] **Bug Bounty Program**: Recompensas por vulnerabilidades

## 14. Incidentes de Segurança

### Processo
1. **Detecção**: Alerta automático ou reporte
2. **Triagem**: Classificar severidade (P0-P4)
3. **Contenção**: Isolar componente afetado
4. **Erradicação**: Remover vulnerabilidade
5. **Recuperação**: Restaurar operação normal
6. **Post-Mortem**: Documentar e aprender

### Comunicação
- **P0 (Crítico)**: Notificar merchants em 1h
- **P1 (Alto)**: Notificar em 6h
- **P2-P4**: Relatório semanal

## 15. Treinamento de Equipe

- [x] Onboarding de segurança para novos devs
- [x] Treinamento anual de OWASP Top 10
- [x] Simulações de incident response
- [x] Code review obrigatório (2 aprovações)
- [x] Security champions em cada squad

## Riscos Críticos e Mitigação

### Top 5 Riscos

1. **Vazamento de API Keys/Secrets**
   - **Impacto**: Alto - acesso não autorizado
   - **Mitigação**: 
     - Nunca logar keys completas
     - Rotação automática trimestral
     - Alertas de uso anômalo
     - Secret scanning no código

2. **Webhook Spoofing**
   - **Impacto**: Alto - creditar saldo indevido
   - **Mitigação**:
     - Validação obrigatória de HMAC
     - Timing-safe compare
     - Timestamp check
     - Logs detalhados

3. **SQL Injection em Ledger**
   - **Impacto**: Crítico - manipulação de saldos
   - **Mitigação**:
     - Prepared statements sempre
     - ORM com validação
     - Princípio do menor privilégio
     - WAF rules específicas

4. **Fraude em Payouts**
   - **Impacto**: Alto - perda financeira
   - **Mitigação**:
     - KYC obrigatório
     - Velocity checks
     - ML fraud detection
     - Revisão manual > R$ 10k
     - 2FA para payouts grandes

5. **DDoS na API**
   - **Impacto**: Médio - indisponibilidade
   - **Mitigação**:
     - WAF + CDN
     - Rate limiting agressivo
     - Circuit breakers
     - Auto-scaling
     - Status page pública
