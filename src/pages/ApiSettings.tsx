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
    <Button
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      className={cn(
        "h-9 w-9 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-primary/20 hover:border-primary/30 transition-all",
        copied && "bg-green-500/20 border-green-500/30 text-green-400"
      )}
    >
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

  useEffect(() => {
    if (user) loadApiKeys();
  }, [user]);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();
      if (data) setApiKeys(data);
    } catch (err) {
      console.error('loadApiKeys error:', err);
    }
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
    } catch (err) {
      toast({ title: 'Erro ao regenerar chaves', variant: 'destructive' });
    }
    setRegenerating(false);
  };

  const maskKey = (key: string) => key ? key.substring(0, 12) + '•'.repeat(20) + key.slice(-4) : '';

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto select-none">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-primary/20 flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Gateway</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas chaves, webhooks e integrações.</p>
          </div>
        </div>

        <Tabs defaultValue="keys" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[hsl(260,20%,8%)] border border-white/[0.06] rounded-xl h-12 p-1">
            <TabsTrigger
              value="keys"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
            >
              <Key className="h-4 w-4" />Chaves API
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
            >
              <Webhook className="h-4 w-4" />Webhooks
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
            >
              <BookOpen className="h-4 w-4" />Documentação
            </TabsTrigger>
          </TabsList>

          {/* ── API KEYS TAB ── */}
          <TabsContent value="keys" className="space-y-5 mt-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[hsl(260,20%,8%)] p-6">
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
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : apiKeys ? (
                <div className="space-y-4">
                  {/* Public Key */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 block">Public Key</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 font-mono text-sm text-foreground/80 break-all select-none">
                        {apiKeys.public_key || 'N/A'}
                      </div>
                      <CopyButton text={apiKeys.public_key || ''} label="Public Key" />
                    </div>
                  </div>

                  {/* Secret Key */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 block">Secret Key</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 font-mono text-sm text-foreground/80 break-all select-none">
                        {showSk ? (apiKeys.secret_key || 'N/A') : maskKey(apiKeys.secret_key || '')}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowSk(!showSk)}
                        className="h-9 w-9 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                      >
                        {showSk ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <CopyButton text={apiKeys.secret_key || ''} label="Secret Key" />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.04]">
                    <Badge
                      variant="outline"
                      className="text-green-400 border-green-500/30 bg-green-500/10 text-[10px]"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />Ativa
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={regenerateKeys}
                      disabled={regenerating}
                      className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", regenerating && "animate-spin")} />
                      Regenerar Chaves
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Key className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhuma chave encontrada.</p>
                  <Button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const { error } = await supabase.rpc('generate_api_keys_for_user' as any, { p_user_id: user!.id });
                        if (error) toast({ title: 'Erro ao gerar chaves', description: error.message, variant: 'destructive' });
                        else { toast({ title: 'Chaves geradas!' }); await loadApiKeys(); }
                      } catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
                      setLoading(false);
                    }}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />Gerar Chaves
                  </Button>
                </div>
              )}
            </div>

            {/* Base URL */}
            <div className="rounded-2xl border border-white/[0.06] bg-[hsl(260,20%,8%)] p-5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 block">Base URL da API</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 font-mono text-sm text-foreground/80 select-none">
                  {BASE_URL}
                </div>
                <CopyButton text={BASE_URL} label="Base URL" />
              </div>
            </div>
          </TabsContent>

          {/* ── WEBHOOKS TAB ── */}
          <TabsContent value="webhooks" className="mt-6">
            <WebhookManager />
          </TabsContent>

          {/* ── DOCS TAB ── */}
          <TabsContent value="docs" className="space-y-5 mt-6">
            {/* Intro */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Code className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground">Documentação da API v2</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ao criar um pagamento via <code className="text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded text-xs">POST /payments</code>, a API gera automaticamente uma cobrança PIX real.
                A resposta inclui o código copia-e-cola e o QR Code. Quando confirmado, seu webhook é notificado e o saldo creditado.
              </p>
            </div>

            {/* Auth */}
            <DocSection title="🔐 Autenticação" description="Envie sua Secret Key no header de todas as requisições:">
              <CopyBlock content={`x-api-key: sk_live_sua_chave_aqui\n\n// ou\nAuthorization: Bearer sk_live_sua_chave_aqui`} />
            </DocSection>

            {/* Create Payment */}
            <DocSection title="💳 Criar Pagamento PIX">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600 text-white border-0 text-[10px]">POST</Badge>
                <code className="text-sm text-foreground/80">/payments</code>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Cria um pagamento e gera um PIX real. Valor em reais (ex: 10.00 = R$ 10,00).</p>
              <CopyBlock
                label="Request"
                content={`curl -X POST ${BASE_URL}/payments \\\n  -H "x-api-key: ${apiKeys?.secret_key ? apiKeys.secret_key.substring(0, 16) + '...' : 'sk_live_xxx'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "amount": 49.90,\n    "description": "Pedido #123",\n    "customer_email": "cliente@email.com",\n    "webhook_url": "https://seusite.com/webhook"\n  }'`}
              />
              <div className="mt-3">
                <CopyBlock
                  label="Response 201"
                  content={`{\n  "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",\n  "external_id": "1055320",\n  "amount": 49.90,\n  "status": "pending",\n  "pix_code": "00020101021226800014br.gov.bcb.pix...",\n  "qr_code": "00020101021226800014br.gov.bcb.pix...",\n  "expires_at": "2026-04-09T19:55:42Z",\n  "provider": "novaera",\n  "created_at": "2026-04-07T19:55:40Z"\n}`}
                />
              </div>
              <InfoBox title="💡 Campos importantes" items={[
                { code: 'pix_code', desc: 'Código copia-e-cola para o cliente pagar' },
                { code: 'qr_code', desc: 'Use para gerar a imagem do QR Code' },
                { code: 'expires_at', desc: 'Data de expiração do PIX (padrão: 1h)' },
                { code: 'external_id', desc: 'ID da transação na adquirente' },
              ]} />
              <InfoBox title="📋 Parâmetros aceitos" items={[
                { code: 'amount', desc: 'Valor em reais (obrigatório, máx: 100.000)' },
                { code: 'description', desc: 'Descrição do pagamento' },
                { code: 'customer_email', desc: 'Email do cliente' },
                { code: 'webhook_url', desc: 'URL para notificação' },
                { code: 'metadata', desc: 'Objeto JSON com dados extras' },
              ]} />
            </DocSection>

            {/* Get Payment */}
            <DocSection title="🔍 Consultar Pagamento">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px]">GET</Badge>
                <code className="text-sm text-foreground/80">/payments/:id</code>
              </div>
              <CopyBlock content={`curl ${BASE_URL}/payments/UUID_DO_PAGAMENTO \\\n  -H "x-api-key: sk_live_xxx"`} />
            </DocSection>

            {/* List Payments */}
            <DocSection title="📋 Listar Pagamentos">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px]">GET</Badge>
                <code className="text-sm text-foreground/80">/payments?status=paid&limit=20&offset=0</code>
              </div>
              <CopyBlock content={`curl "${BASE_URL}/payments?status=pending&limit=10" \\\n  -H "x-api-key: sk_live_xxx"`} />
              <p className="text-xs text-muted-foreground mt-2">Filtros: <code>status</code>, <code>limit</code> (máx 100), <code>offset</code></p>
            </DocSection>

            {/* Update Status */}
            <DocSection title="✏️ Atualizar Status (manual)">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-[10px]">PATCH</Badge>
                <code className="text-sm text-foreground/80">/payments/:id/status</code>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Status é atualizado automaticamente quando o PIX é pago. Use apenas para override manual.</p>
              <CopyBlock content={`curl -X PATCH ${BASE_URL}/payments/UUID/status \\\n  -H "x-api-key: sk_live_xxx" \\\n  -H "Content-Type: application/json" \\\n  -d '{"status": "canceled"}'`} />
              <p className="text-xs text-muted-foreground mt-2">Status válidos: <code>pending</code>, <code>paid</code>, <code>canceled</code>, <code>expired</code>, <code>failed</code></p>
            </DocSection>

            {/* JavaScript Example */}
            <DocSection title="🟨 Exemplo JavaScript">
              <CopyBlock
                label="JavaScript"
                content={`const response = await fetch('${BASE_URL}/payments', {\n  method: 'POST',\n  headers: {\n    'x-api-key': 'sk_live_sua_chave',\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({\n    amount: 99.90,\n    description: 'Assinatura mensal',\n    customer_email: 'cliente@email.com',\n    webhook_url: 'https://seusite.com/webhook',\n  }),\n});\n\nconst payment = await response.json();\nconsole.log('PIX Copia e Cola:', payment.pix_code);\nconsole.log('Expira em:', payment.expires_at);`}
              />
            </DocSection>

            {/* Webhook docs */}
            <DocSection title="🔔 Webhook — Notificação de Pagamento" description="Quando o cliente paga o PIX, enviamos automaticamente um POST:">
              <CopyBlock
                label="Webhook Payload"
                content={`{\n  "event": "payment.paid",\n  "payment": {\n    "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",\n    "amount": 49.90,\n    "status": "paid",\n    "paid_at": "2026-04-07T20:01:30Z"\n  }\n}`}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Webhooks incluem o header <code className="text-primary/70">X-Treex-Signature</code> (HMAC SHA-256) para validação.
              </p>
            </DocSection>

            {/* Flow */}
            <DocSection title="📊 Fluxo Completo">
              <CopyBlock
                content={`Seu Sistema              TreexPay                 Adquirente\n    │                        │                        │\n    ├── POST /payments ─────>│                        │\n    │                        ├── Gera PIX real ──────>│\n    │                        │<── pix_code + qr ─────┤\n    │<── 201 + dados PIX ───┤                        │\n    │                        │                        │\n    │  (cliente paga)        │                        │\n    │                        │<── webhook: pago ─────┤\n    │                        ├── Credita saldo        │\n    │<── webhook: paid ─────┤                        │`}
              />
            </DocSection>

            {/* Health */}
            <DocSection title="🏥 Health Check (público)">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px]">GET</Badge>
                <code className="text-sm text-foreground/80">/health</code>
              </div>
              <CopyBlock content={`curl ${BASE_URL}/health`} />
              <div className="mt-3">
                <CopyBlock
                  label="Response"
                  content={`{\n  "status": "ok",\n  "service": "TreexPay API Gateway",\n  "version": "2.0.0",\n  "features": ["pix"],\n  "timestamp": "2026-04-07T19:55:30Z"\n}`}
                />
              </div>
            </DocSection>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/* ── Helper Components ── */

function DocSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[hsl(260,20%,8%)] p-6">
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

function InfoBox({ title, items }: { title: string; items: { code: string; desc: string }[] }) {
  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-xs font-semibold text-foreground mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.code} className="text-xs text-muted-foreground flex items-start gap-2">
            <code className="text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded text-[10px] shrink-0">{item.code}</code>
            <span>{item.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
