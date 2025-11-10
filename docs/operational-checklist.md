# Checklist Operacional para Lançamento

## Pré-Lançamento (1 mês antes)

### Infraestrutura
- [ ] Ambiente de produção provisionado
- [ ] CDN configurado (CloudFlare/Akamai)
- [ ] WAF ativado
- [ ] Auto-scaling configurado
- [ ] Load balancers configurados
- [ ] Certificados SSL configurados e renovação automática
- [ ] DNS configurado com failover
- [ ] Backup automático configurado (diário)

### Monitoramento e Observabilidade
- [ ] Sistema de logs centralizado (ELK/Datadog)
- [ ] APM instalado (New Relic/Datadog)
- [ ] Métricas de negócio configuradas
- [ ] Dashboards criados
- [ ] Alertas configurados (ver seção de Alertas)
- [ ] Status page público (status.gateway.com)
- [ ] On-call rotation definida

### Segurança
- [ ] Penetration test completo
- [ ] Vulnerability scan realizado
- [ ] Secrets rotacionados
- [ ] Rate limiting testado
- [ ] DDoS protection testada
- [ ] Webhook signature validation testada
- [ ] PCI compliance audit (se aplicável)
- [ ] LGPD compliance checklist completo

### Integrações
- [ ] Fornecedor de PIX integrado e testado
- [ ] Adquirentes de cartão integrados
- [ ] Boleto integrado
- [ ] OneSignal/push notifications configurado
- [ ] Email provider configurado (SendGrid/SES)
- [ ] SMS provider configurado (Twilio)
- [ ] Fraud detection configurado
- [ ] KYC provider integrado

### Documentação
- [ ] OpenAPI spec publicada
- [ ] Guia de início rápido escrito
- [ ] SDK publicado no npm
- [ ] Exemplos de código prontos
- [ ] Changelog iniciado
- [ ] Política de privacidade publicada
- [ ] Termos de uso publicados
- [ ] SLA definido e publicado

## 2 Semanas Antes

### Testes
- [ ] Testes de carga realizados (LoadTest/K6)
- [ ] Testes de caos (ChaosMesh/Gremlin)
- [ ] Disaster recovery testado
- [ ] Failover testado
- [ ] Backup restore testado
- [ ] Todos os cenários de webhook testados
- [ ] Idempotência testada extensivamente
- [ ] Rate limiting testado sob carga

### Processos
- [ ] Runbook de incidentes criado
- [ ] Processo de deploy documentado
- [ ] Processo de rollback documentado
- [ ] Escalation matrix definida
- [ ] Post-mortem template criado

### Treinamento
- [ ] Equipe de suporte treinada
- [ ] Simulação de incident response
- [ ] Demo da API para equipe comercial

## 1 Semana Antes

### Beta Privado
- [ ] 5-10 merchants beta selecionados
- [ ] Onboarding beta merchants
- [ ] Feedback beta coletado
- [ ] Bugs críticos corrigidos
- [ ] Performance tuning baseado em uso real

### Comunicação
- [ ] Email de lançamento preparado
- [ ] Blog post escrito
- [ ] Social media posts preparados
- [ ] Press release (se aplicável)
- [ ] Suporte preparado para volume

## Dia do Lançamento

### Morning Checklist
- [ ] Verificar status de todos os serviços
- [ ] Verificar métricas das últimas 24h
- [ ] Verificar logs por erros
- [ ] Confirmar equipe de on-call disponível
- [ ] Confirmar canais de comunicação abertos

### Deploy
- [ ] Deploy em horário de baixo tráfego
- [ ] Smoke tests após deploy
- [ ] Monitorar métricas por 1h
- [ ] Comunicar lançamento

### Pós-Lançamento (primeiras 24h)
- [ ] Monitoramento ativo 24/7
- [ ] Responder perguntas no suporte rapidamente
- [ ] Coletar feedback inicial
- [ ] Ajustes de performance se necessário

## Métricas para Acompanhar

### SLIs (Service Level Indicators)

#### Disponibilidade
- **Target**: 99.9% uptime (43 min downtime/mês)
- **Medição**: Requests bem-sucedidos / Total requests
- **Alerta**: < 99.5%

#### Latência
- **Target**: 
  - p50 < 200ms
  - p95 < 500ms
  - p99 < 1s
- **Alerta**: p95 > 800ms por 5min

#### Success Rate
- **Target**: > 99% requests com status 2xx
- **Alerta**: < 98% por 5min

#### Webhook Delivery
- **Target**: 95% entregues na primeira tentativa
- **Alerta**: < 90%

### Métricas de Negócio

#### Volume
- Transações por dia/hora
- Valor transacionado
- GMV (Gross Merchandise Volume)

#### Conversão
- Payment approval rate
- Abandonment rate
- Fraud detection rate

#### Financeiro
- Revenue (fees)
- Chargeback rate
- Payout volume

## Alertas Configurados

### P0 - Crítico (Ação Imediata)
- [ ] API down (> 1min)
- [ ] Database down
- [ ] Error rate > 10%
- [ ] Payment approval rate < 80%
- [ ] Webhook delivery < 70%

### P1 - Alto (Ação em 15min)
- [ ] Latency p99 > 2s por 5min
- [ ] Error rate > 5%
- [ ] Queue backlog > 10k
- [ ] Disk usage > 85%
- [ ] Memory usage > 90%

### P2 - Médio (Ação em 1h)
- [ ] Error rate > 2%
- [ ] Latency p95 > 800ms
- [ ] Webhook retry > 20%
- [ ] Fraud rate > 5%

### P3 - Baixo (Revisar diariamente)
- [ ] Slow queries (> 1s)
- [ ] Certificate expiring < 30 dias
- [ ] API key não usada há 90 dias

## Dashboard Essencial

### Real-Time Operations
```
┌─────────────────────────────────────────┐
│ Requests/sec: 1,234                     │
│ Success Rate: 99.8%                     │
│ Latency p95: 320ms                      │
│ Active Connections: 456                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Payments                                │
│  - Created: 89/min                      │
│  - Approved: 82/min (92%)               │
│  - Failed: 7/min (8%)                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Webhooks                                │
│  - Delivered: 95%                       │
│  - Retrying: 4%                         │
│  - Failed: 1%                           │
└─────────────────────────────────────────┘
```

### Financial Dashboard
```
┌─────────────────────────────────────────┐
│ Today's Volume                          │
│  - GMV: R$ 1.2M                         │
│  - Transactions: 3,456                  │
│  - Average Ticket: R$ 347               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Revenue (Fees)                          │
│  - Today: R$ 23,456                     │
│  - Month: R$ 456,789                    │
│  - Pending Payouts: R$ 234,567          │
└─────────────────────────────────────────┘
```

## Incident Response Runbook

### Passo 1: Detectar
- Alerta automático dispara
- Ou: Cliente reporta problema

### Passo 2: Avaliar Severidade
- **P0**: Afeta todos os clientes, perda de $$
- **P1**: Afeta subset de clientes
- **P2**: Problema menor, workaround exists
- **P3**: Cosmético ou documentação

### Passo 3: Comunicar
- Atualizar status page
- Notificar merchants afetados
- Criar incident channel (Slack)

### Passo 4: Mitigar
- Rollback se foi deploy recente
- Scale up se é capacity
- Isolar componente com problema

### Passo 5: Resolver
- Fix root cause
- Deploy fix
- Verificar resolução

### Passo 6: Post-Mortem
- Dentro de 48h após resolução
- Timeline detalhada
- Root cause analysis
- Action items com owners

## Limitações e Restrições

### Limites Recomendados

#### Por Merchant (sem KYC completo)
- Max R$ 10.000/mês transacionado
- Max R$ 1.000 por payout
- Max 10 payouts/dia

#### Por Merchant (KYC completo)
- Max R$ 1.000.000/mês transacionado
- Max R$ 100.000 por payout
- Unlimited payouts

#### Rate Limiting
- 60 requests/min por API key
- 100 requests/min por OAuth token
- 10.000 requests/min global por IP

#### Retenção para Chargeback
- PIX: 0 dias (sem risco)
- Boleto: 0 dias (sem risco)
- Cartão: 30 dias (10% do volume retido)

## Escalation Matrix

| Severidade | Tempo | Quem Notificar |
|------------|-------|----------------|
| P0 | Imediato | CTO + On-call + CEO |
| P1 | 15 min | Tech Lead + On-call |
| P2 | 1 hora | Team Lead |
| P3 | Daily standup | Team |

## SLAs Definidos

### Uptime
- **Commitment**: 99.9% mensal
- **Medição**: Requests bem-sucedidos
- **Exclusões**: Manutenções programadas (notificadas com 7 dias)
- **Crédito**: 10% do fee mensal por cada 0.1% abaixo do SLA

### Latência
- **Commitment**: p95 < 500ms
- **Medição**: Response time do POST /payments
- **Sem penalidade**, mas tracking público

### Webhook Delivery
- **Commitment**: 95% delivered em 1min
- **Retry Policy**: Até 7 tentativas em 31h
- **Sem penalidade**, mas tracking público

### Suporte
- **P0**: Resposta em 30min, 24/7
- **P1**: Resposta em 2h, business hours
- **P2**: Resposta em 8h
- **P3**: Resposta em 24h

## Ferramentas Recomendadas

### Infraestrutura
- **Cloud**: AWS/GCP/Azure
- **CDN**: CloudFlare
- **WAF**: CloudFlare/AWS WAF
- **Load Balancer**: AWS ALB/NLB

### Monitoramento
- **APM**: Datadog/New Relic
- **Logs**: ELK Stack/Datadog
- **Metrics**: Prometheus+Grafana
- **Traces**: Jaeger/Zipkin
- **Status Page**: Statuspage.io

### Desenvolvimento
- **CI/CD**: GitHub Actions/GitLab CI
- **IaC**: Terraform
- **Secrets**: Vault/AWS Secrets Manager
- **Feature Flags**: LaunchDarkly

### Segurança
- **Vulnerability Scan**: Snyk/Dependabot
- **SAST**: SonarQube
- **Secrets Scan**: GitGuardian/TruffleHog
- **Penetration Test**: Empresa especializada

### Comunicação
- **Chat**: Slack
- **On-call**: PagerDuty/Opsgenie
- **Docs**: GitBook/Readme.io
