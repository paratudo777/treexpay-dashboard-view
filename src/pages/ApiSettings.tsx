import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Eye, EyeOff, RefreshCw, Plus, Key, Webhook, BookOpen, Zap, Shield, Code, Check } from 'lucide-react';
import { WebhookManager } from '@/components/webhooks/WebhookManager';
import { CopyBlock } from '@/components/api/CopyBlock';
import { cn } from '@/lib/utils';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: `${label} copiada!` });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="icon" variant="outline" onClick={handleCopy} className={cn("h-9 w-9", copied && "bg-green-500/20 text-green-400 border-green-500/30")}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export default function ApiSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<any>(null);
  const [showSk, setShowSk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const BASE_URL = `https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway`;

  useEffect(() => { if (user) loadApiKeys(); }, [user]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('api_keys').select('*').eq('user_id', user!.id).eq('status', 'active').maybeSingle();
      if (data) setApiKeys(data);
    } catch (err) { console.error('loadApiKeys error:', err); }
    setLoading(false);
  };

  const regenerateKeys = async () => {
    if (!confirm('Tem certeza? As chaves atuais serão invalidadas.')) return;
    setRegenerating(true);
    try {
      if (apiKeys) await supabase.from('api_keys').update({ status: 'revoked' }).eq('id', apiKeys.id);
      await supabase.rpc('generate_api_keys_for_user' as any, { p_user_id: user!.id });
      const { data } = await supabase.from('api_keys').select('*').eq('user_id', user!.id).eq('status', 'active').maybeSingle();
      setApiKeys(data);
      toast({ title: 'Chaves regeneradas!' });
    } catch { toast({ title: 'Erro ao regenerar chaves', variant: 'destructive' }); }
    setRegenerating(false);
  };

  const maskKey = (key: string) => key ? key.substring(0, 12) + '•'.repeat(20) + key.slice(-4) : '';

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Gateway</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas chaves, webhooks e integrações.</p>
          </div>
        </div>

        <Tabs defaultValue="keys" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="keys" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2"><Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Chaves API</span><span className="sm:hidden">Chaves</span></TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2"><Webhook className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Webhooks</TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2"><BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Documentação</span><span className="sm:hidden">Docs</span></TabsTrigger>
          </TabsList>

          {/* ── KEYS ── */}
          <TabsContent value="keys" className="space-y-5 mt-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Suas Chaves de API</h2>
                  <p className="text-xs text-muted-foreground">Use a Secret Key para autenticar. Nunca exponha no frontend.</p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>
              ) : apiKeys ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">PUBLIC KEY</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted border border-border rounded-xl px-3 sm:px-4 py-2.5 font-mono text-xs sm:text-sm text-foreground break-all">{apiKeys.public_key || 'N/A'}</div>
                      <CopyButton text={apiKeys.public_key || ''} label="Public Key" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">SECRET KEY</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted border border-border rounded-xl px-3 sm:px-4 py-2.5 font-mono text-xs sm:text-sm text-foreground break-all">
                        {showSk ? (apiKeys.secret_key || 'N/A') : maskKey(apiKeys.secret_key || '')}
                      </div>
                      <Button size="icon" variant="outline" onClick={() => setShowSk(!showSk)} className="h-9 w-9">
                        {showSk ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <CopyButton text={apiKeys.secret_key || ''} label="Secret Key" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-border gap-3">
                    <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10 text-[10px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />Ativa
                    </Badge>
                    <Button variant="outline" size="sm" onClick={regenerateKeys} disabled={regenerating} className="text-destructive border-destructive/30 hover:bg-destructive/10 w-full sm:w-auto">
                      <RefreshCw className={cn("h-4 w-4 mr-2", regenerating && "animate-spin")} />Regenerar Chaves
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Key className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhuma chave encontrada.</p>
                  <Button onClick={async () => {
                    setLoading(true);
                    try {
                      const { error } = await supabase.rpc('generate_api_keys_for_user' as any, { p_user_id: user!.id });
                      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                      else { toast({ title: 'Chaves geradas!' }); await loadApiKeys(); }
                    } catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
                    setLoading(false);
                  }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    <Plus className="h-4 w-4 mr-2" />Gerar Chaves
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">BASE URL DA API</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted border border-border rounded-xl px-3 sm:px-4 py-2.5 font-mono text-xs sm:text-sm text-foreground break-all overflow-x-auto">{BASE_URL}</div>
                <CopyButton text={BASE_URL} label="Base URL" />
              </div>
            </div>
          </TabsContent>

          {/* ── WEBHOOKS ── */}
          <TabsContent value="webhooks" className="mt-6">
            <WebhookManager />
          </TabsContent>

          {/* ── DOCS ── */}
          <TabsContent value="docs" className="space-y-5 mt-6">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Code className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground">Documentação da API v3.1</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                A API suporta pagamentos via <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">PIX</code> e{' '}
                <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">Cartão de Crédito</code>.
                Use <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">POST /payments</code> com o campo <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">paymentMethod</code> para escolher o método.
              </p>
            </div>

            <DocSection title="🔐 Autenticação" description="Envie sua Secret Key no header de todas as requisições:">
              <CopyBlock content={`x-api-key: sk_live_sua_chave_aqui\n\n// ou\nAuthorization: Bearer sk_live_sua_chave_aqui`} />
            </DocSection>

            {/* PIX */}
            <DocSection title="💳 Criar Pagamento PIX">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600 text-white border-0 text-[10px]">POST</Badge>
                <code className="text-sm text-foreground">/payments</code>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Cria um pagamento PIX real. O campo <code className="text-primary">paymentMethod</code> é opcional (padrão: <code>"pix"</code>).</p>
              <CopyBlock label="Request" content={`curl -X POST ${BASE_URL}/payments \\\n  -H "x-api-key: ${apiKeys?.secret_key ? apiKeys.secret_key.substring(0, 16) + '...' : 'sk_live_xxx'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "amount": 49.90,\n    "paymentMethod": "pix",\n    "description": "Pedido #123",\n    "customer_email": "cliente@email.com",\n    "webhook_url": "https://seusite.com/webhook"\n  }'`} />
              <div className="mt-3">
                <CopyBlock label="Response 201" content={`{\n  "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",\n  "external_id": "1055320",\n  "amount": 49.90,\n  "status": "pending",\n  "payment_method": "pix",\n  "pix_code": "00020101021226800014br.gov.bcb.pix...",\n  "qr_code": "00020101021226800014br.gov.bcb.pix...",\n  "expires_at": "2026-04-09T19:55:42Z",\n  "provider": "novaera",\n  "created_at": "2026-04-07T19:55:40Z"\n}`} />
              </div>
              <InfoBox title="📋 Parâmetros PIX" items={[
                { code: 'amount', desc: 'Valor em reais (obrigatório, máx: 100.000)' },
                { code: 'paymentMethod', desc: '"pix" (padrão se omitido)' },
                { code: 'description', desc: 'Descrição do pagamento' },
                { code: 'customer_email', desc: 'Email do cliente' },
                { code: 'webhook_url', desc: 'URL para notificação quando pago' },
                { code: 'metadata', desc: 'Objeto JSON com dados extras' },
              ]} />
            </DocSection>

            {/* CARTÃO DE CRÉDITO */}
            <DocSection title="💳 Criar Pagamento com Cartão de Crédito">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600 text-white border-0 text-[10px]">POST</Badge>
                <code className="text-sm text-foreground">/payments</code>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Pagamentos com cartão são processados via <strong>Bestfy</strong>. O campo <code className="text-primary">paymentMethod</code> deve ser <code>"credit_card"</code>.
                Os objetos <code className="text-primary">card</code> e <code className="text-primary">customer</code> (com CPF) são obrigatórios.
              </p>
              <CopyBlock label="Request" content={`curl -X POST ${BASE_URL}/payments \\\n  -H "x-api-key: ${apiKeys?.secret_key ? apiKeys.secret_key.substring(0, 16) + '...' : 'sk_live_xxx'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "amount": 150.00,\n    "paymentMethod": "credit_card",\n    "description": "Produto Premium",\n    "installments": 1,\n    "customer": {\n      "name": "João da Silva",\n      "email": "joao@email.com",\n      "document": "11144477735"\n    },\n    "card": {\n      "number": "4111111111111111",\n      "cvv": "123",\n      "month": "12",\n      "year": "2028",\n      "firstName": "JOAO",\n      "lastName": "DA SILVA"\n    },\n    "webhook_url": "https://seusite.com/webhook"\n  }'`} />
              <div className="mt-3">
                <CopyBlock label="Response 201" content={`{\n  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n  "external_id": "2055421",\n  "amount": 150.00,\n  "status": "paid",\n  "payment_method": "credit_card",\n  "description": "Produto Premium",\n  "provider": "bestfy",\n  "created_at": "2026-04-11T15:30:00Z",\n  "paid_at": "2026-04-11T15:30:02Z"\n}`} />
              </div>
              <InfoBox title="💳 Campos do card (obrigatórios)" items={[
                { code: 'number', desc: 'Número do cartão (sem espaços)' },
                { code: 'cvv', desc: 'Código de segurança (3-4 dígitos)' },
                { code: 'month', desc: 'Mês de validade (ex: "12")' },
                { code: 'year', desc: 'Ano de validade (ex: "2028" ou "28")' },
                { code: 'firstName', desc: 'Primeiro nome no cartão (opcional, usa customer.name)' },
                { code: 'lastName', desc: 'Sobrenome no cartão (opcional)' },
              ]} />
              <InfoBox title="👤 Campos do customer (obrigatórios p/ cartão)" items={[
                { code: 'name', desc: 'Nome completo do cliente' },
                { code: 'document', desc: 'CPF do titular (apenas números)' },
                { code: 'email', desc: 'E-mail do cliente (opcional)' },
                { code: 'phone', desc: 'Telefone do cliente (opcional)' },
                { code: 'ip', desc: 'IP real do cliente — reduz rejeições por antifraude (opcional)' },
              ]} />
              <InfoBox title="🛡️ Campos anti-fraude (opcionais, recomendados)" items={[
                { code: 'customer.ip', desc: 'IP real do cliente (x-forwarded-for). Aumenta taxa de aprovação.' },
                { code: 'metadata.user_agent', desc: 'User-Agent do navegador do cliente. Diferencia humano de bot.' },
                { code: 'metadata.source', desc: 'Origem do pagamento (ex: "checkout_web", "app_mobile")' },
              ]} />
              <InfoBox title="📌 Status possíveis na resposta" items={[
                { code: 'paid', desc: 'Pagamento aprovado imediatamente' },
                { code: 'pending', desc: 'Aguardando confirmação (webhook será enviado)' },
                { code: 'failed', desc: 'Cartão recusado pela operadora' },
              ]} />
              <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold text-foreground mb-2">💰 Parcelamento</p>
                <p className="text-xs text-muted-foreground">
                  Use o campo <code className="text-primary">installments</code> (1 a 12) para pagamentos parcelados.
                  Se omitido, o padrão é 1 (à vista).
                </p>
              </div>
            </DocSection>

            <DocSection title="🔍 Consultar Pagamento">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px]">GET</Badge>
                <code className="text-sm text-foreground">/payments/:id</code>
              </div>
              <CopyBlock content={`curl ${BASE_URL}/payments/UUID_DO_PAGAMENTO \\\n  -H "x-api-key: sk_live_xxx"`} />
            </DocSection>

            <DocSection title="📋 Listar Pagamentos">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px]">GET</Badge>
                <code className="text-sm text-foreground">/payments?status=paid&limit=20&offset=0</code>
              </div>
              <CopyBlock content={`curl "${BASE_URL}/payments?status=pending&limit=10" \\\n  -H "x-api-key: sk_live_xxx"`} />
              <p className="text-xs text-muted-foreground mt-2">Filtros: <code>status</code>, <code>limit</code> (máx 100), <code>offset</code></p>
            </DocSection>

            <DocSection title="✏️ Atualizar Status (manual)">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-[10px]">PATCH</Badge>
                <code className="text-sm text-foreground">/payments/:id/status</code>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Status é atualizado automaticamente via webhook. Use apenas para override manual.</p>
              <CopyBlock content={`curl -X PATCH ${BASE_URL}/payments/UUID/status \\\n  -H "x-api-key: sk_live_xxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"status": "canceled"}'`} />
              <p className="text-xs text-muted-foreground mt-2">Status válidos: <code>pending</code>, <code>paid</code>, <code>canceled</code>, <code>expired</code>, <code>failed</code></p>
            </DocSection>

            {/* JS Examples */}
            <DocSection title="🟨 Exemplo JavaScript — PIX">
              <CopyBlock label="JavaScript" content={`const response = await fetch('${BASE_URL}/payments', {\n  method: 'POST',\n  headers: {\n    'x-api-key': 'sk_live_sua_chave',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({\n    amount: 99.90,\n    paymentMethod: 'pix',\n    description: 'Assinatura mensal',\n    customer_email: 'cliente@email.com',\n    webhook_url: 'https://seusite.com/webhook',\n  }),\n});\n\nconst payment = await response.json();\nconsole.log('PIX Copia e Cola:', payment.pix_code);`} />
            </DocSection>

            <DocSection title="🟨 Exemplo JavaScript — Cartão">
              <CopyBlock label="JavaScript" content={`const response = await fetch('${BASE_URL}/payments', {\n  method: 'POST',\n  headers: {\n    'x-api-key': 'sk_live_sua_chave',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({\n    amount: 250.00,\n    paymentMethod: 'credit_card',\n    installments: 3,\n    customer: {\n      name: 'Maria Souza',\n      document: '22233344455',\n      email: 'maria@email.com',\n    },\n    card: {\n      number: '5111111111111118',\n      cvv: '456',\n      month: '03',\n      year: '2029',\n    },\n  }),\n});\n\nconst payment = await response.json();\nconsole.log('Status:', payment.status);`} />
            </DocSection>

            <DocSection title="🔔 Webhook — Notificação" description="Quando o pagamento é confirmado (PIX pago ou cartão aprovado), enviamos um POST:">
              <CopyBlock label="Webhook Payload" content={`{\n  "event": "payment.paid",\n  "payment": {\n    "id": "73a95625-...",\n    "amount": 49.90,\n    "status": "paid",\n    "payment_method": "pix",\n    "paid_at": "2026-04-07T20:01:30Z"\n  }\n}`} />
              <p className="text-xs text-muted-foreground mt-2">Inclui header <code className="text-primary">X-Treex-Signature</code> (HMAC SHA-256).</p>
            </DocSection>

            <DocSection title="📊 Fluxo Completo">
              <CopyBlock content={`Seu Sistema              TreexPay                 Adquirente\n    │                        │                        │\n    ├── POST /payments ─────>│                        │\n    │   (pix ou cartão)      │                        │\n    │                        ├── Processa via ───────>│\n    │                        │   NovaEra (PIX) ou     │\n    │                        │   Bestfy (cartão/PIX)  │\n    │                        │<── resposta ──────────┤\n    │<── 201 + dados ───────┤                        │\n    │                        │                        │\n    │  (pagamento confirmado)│                        │\n    │                        │<── webhook: pago ─────┤\n    │                        ├── Credita saldo        │\n    │<── webhook: paid ─────┤                        │`} />
            </DocSection>

            <DocSection title="📋 Resumo dos Métodos">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-semibold">Método</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-semibold">paymentMethod</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-semibold">Provedor</th>
                      <th className="text-left py-2 text-muted-foreground font-semibold">Campos Obrigatórios</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4 text-foreground">PIX</td>
                      <td className="py-2 pr-4"><code className="text-primary">"pix"</code> (padrão)</td>
                      <td className="py-2 pr-4 text-muted-foreground">NovaEra / Bestfy</td>
                      <td className="py-2 text-muted-foreground"><code>amount</code></td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-foreground">Cartão de Crédito</td>
                      <td className="py-2 pr-4"><code className="text-primary">"credit_card"</code></td>
                      <td className="py-2 pr-4 text-muted-foreground">Bestfy</td>
                      <td className="py-2 text-muted-foreground"><code>amount</code>, <code>card</code>, <code>customer</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </DocSection>

            <DocSection title="🏥 Health Check (público)">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px]">GET</Badge>
                <code className="text-sm text-foreground">/health</code>
              </div>
              <CopyBlock content={`curl ${BASE_URL}/health`} />
              <div className="mt-3">
                <CopyBlock label="Response" content={`{\n  "status": "ok",\n  "service": "TreexPay API Gateway",\n  "version": "3.1.0",\n  "features": ["pix", "credit_card", "multi-provider", "idempotency"],\n  "timestamp": "2026-04-11T19:55:30Z"\n}`} />
              </div>
            </DocSection>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function DocSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

function InfoBox({ title, items }: { title: string; items: { code: string; desc: string }[] }) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold text-foreground mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.code} className="text-xs text-muted-foreground flex items-start gap-2">
            <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[10px] shrink-0">{item.code}</code>
            <span>{item.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
