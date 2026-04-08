import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Eye, EyeOff, RefreshCw, Plus, Trash2, Key, Webhook, BookOpen, Zap, Shield, Code } from 'lucide-react';
import { WebhookManager } from '@/components/webhooks/WebhookManager';

export default function ApiSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<any>(null);
  const [showSk, setShowSk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);

  const BASE_URL = `https://fhwfonispezljglrclia.supabase.co/functions/v1/api-gateway`;

  useEffect(() => {
    console.log('ApiSettings: página carregada', {
      route: window.location.pathname,
      hasUser: !!user,
      userId: user?.id,
    });

    if (user) {
      loadApiKeys();
      loadWebhooks();
    }
  }, [user]);

  const loadApiKeys = async () => {
    console.log('ApiSettings: iniciando loadApiKeys');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      console.log('ApiSettings: resultado api_keys', { data, error });

      if (data) {
        setApiKeys(data);
      } else {
        console.log('ApiSettings: nenhuma chave ativa encontrada');
        // Don't auto-generate, let user click the button
      }
    } catch (err) {
      console.error('ApiSettings: erro em loadApiKeys', err);
    }
    setLoading(false);
  };

  const loadWebhooks = async () => {
    console.log('ApiSettings: iniciando loadWebhooks');
    const { data, error } = await supabase
      .from('user_webhooks')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    console.log('ApiSettings: resultado webhooks', { data, error });
    setWebhooks(data || []);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiada!`, description: 'Colada na área de transferência.' });
  };

  const regenerateKeys = async () => {
    if (!confirm('Tem certeza? As chaves atuais serão invalidadas.')) return;
    setRegenerating(true);
    
    try {
      // Deactivate current key
      if (apiKeys) {
        await supabase.from('api_keys').update({ status: 'revoked' }).eq('id', apiKeys.id);
      }

      // Generate new keys
      await supabase.rpc('generate_api_keys_for_user' as any, { p_user_id: user!.id });
      
      const { data } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();
      
      setApiKeys(data);
      toast({ title: 'Chaves regeneradas!', description: 'Atualize suas integrações com as novas chaves.' });
    } catch (err) {
      console.error('regenerateKeys error:', err);
      toast({ title: 'Erro ao regenerar chaves', variant: 'destructive' });
    }
    
    setRegenerating(false);
  };

  const addWebhook = async () => {
    if (!newWebhookUrl.trim()) return;
    try {
      new URL(newWebhookUrl);
    } catch {
      toast({ title: 'URL inválida', variant: 'destructive' });
      return;
    }

    setSavingWebhook(true);
    const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
    const { error } = await supabase.from('user_webhooks').insert({
      user_id: user!.id,
      url: newWebhookUrl.trim(),
      secret,
      is_active: true,
    });

    if (!error) {
      setNewWebhookUrl('');
      loadWebhooks();
      toast({ title: 'Webhook adicionado!' });
    }
    setSavingWebhook(false);
  };

  const toggleWebhook = async (id: string, active: boolean) => {
    await supabase.from('user_webhooks').update({ is_active: active }).eq('id', id);
    loadWebhooks();
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Remover este webhook?')) return;
    await supabase.from('user_webhooks').delete().eq('id', id);
    loadWebhooks();
    toast({ title: 'Webhook removido' });
  };

  const maskKey = (key: string) => key ? key.substring(0, 12) + '•'.repeat(20) + key.slice(-4) : '';

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            API Gateway
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie suas chaves, webhooks e veja a documentação da API.</p>
        </div>

        <Tabs defaultValue="keys" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="keys" className="flex items-center gap-2"><Key className="h-4 w-4" />Chaves API</TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2"><Webhook className="h-4 w-4" />Webhooks</TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Documentação</TabsTrigger>
          </TabsList>

          {/* ── API KEYS TAB ── */}
          <TabsContent value="keys" className="space-y-4 mt-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Suas Chaves de API</CardTitle>
                <CardDescription>Use a Secret Key para autenticar chamadas à API. Nunca exponha no frontend.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
                ) : apiKeys ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Public Key</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">{apiKeys.public_key || 'N/A'}</code>
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(apiKeys.public_key, 'Public Key')}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Secret Key</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">
                          {showSk ? (apiKeys.secret_key || 'N/A') : maskKey(apiKeys.secret_key || '')}
                        </code>
                        <Button size="icon" variant="outline" onClick={() => setShowSk(!showSk)}>
                          {showSk ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(apiKeys.secret_key, 'Secret Key')}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <Badge variant="outline" className="text-primary border-primary">
                        <div className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />Ativa
                      </Badge>
                      <Button variant="destructive" size="sm" onClick={regenerateKeys} disabled={regenerating}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                        Regenerar Chaves
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Nenhuma chave encontrada.</p>
                    <Button onClick={async () => {
                      setLoading(true);
                      try {
                        const { error: rpcError } = await supabase.rpc('generate_api_keys_for_user' as any, { p_user_id: user!.id });
                        if (rpcError) {
                          console.error('Erro RPC:', rpcError);
                          toast({ title: 'Erro ao gerar chaves', description: rpcError.message, variant: 'destructive' });
                        } else {
                          toast({ title: 'Chaves geradas com sucesso!' });
                          await loadApiKeys();
                        }
                      } catch (err: any) {
                        console.error('Erro ao gerar chaves:', err);
                        toast({ title: 'Erro ao gerar chaves', description: err.message, variant: 'destructive' });
                      }
                      setLoading(false);
                    }}><Plus className="h-4 w-4 mr-2" />Gerar Chaves</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Base URL da API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono">{BASE_URL}</code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(BASE_URL, 'Base URL')}><Copy className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── WEBHOOKS TAB ── */}
          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <WebhookManager />
          </TabsContent>

          {/* ── DOCS TAB ── */}
          <TabsContent value="docs" className="space-y-4 mt-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" />Documentação da API v2</CardTitle>
                <CardDescription>Gateway de Pagamentos PIX — Integre em minutos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Intro */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h3 className="font-semibold text-base mb-1">🚀 Como funciona</h3>
                  <p className="text-sm text-muted-foreground">
                    Ao criar um pagamento via <code>POST /payments</code>, a API gera automaticamente uma cobrança PIX real.
                    A resposta inclui o <strong>código copia-e-cola</strong> e o <strong>QR Code</strong> prontos para o cliente pagar.
                    Quando o pagamento for confirmado, seu webhook é notificado e o saldo é creditado automaticamente.
                  </p>
                </div>

                {/* Auth */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">🔐 Autenticação</h3>
                  <p className="text-sm text-muted-foreground mb-2">Envie sua Secret Key no header de todas as requisições:</p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`x-api-key: sk_live_sua_chave_aqui

// ou
Authorization: Bearer sk_live_sua_chave_aqui`}</pre>
                </div>

                {/* Create Payment */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">💳 Criar Pagamento PIX</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-600">POST</Badge>
                    <code className="text-sm">/payments</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Cria um pagamento e gera um PIX real automaticamente. O valor é em reais (ex: 10.00 = R$ 10,00).</p>
                  
                  <p className="text-sm font-medium mt-3 mb-1">Request:</p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`curl -X POST ${BASE_URL}/payments \\
  -H "x-api-key: ${apiKeys?.secret_key ? apiKeys.secret_key.substring(0, 16) + '...' : 'sk_live_xxx'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 49.90,
    "description": "Pedido #123",
    "customer_email": "cliente@email.com",
    "webhook_url": "https://seusite.com/webhook"
  }'`}</pre>

                  <p className="text-sm font-medium mt-3 mb-1">Resposta (201):</p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`{
  "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",
  "external_id": "1055320",
  "amount": 49.90,
  "status": "pending",
  "description": "Pedido #123",
  "customer_email": "cliente@email.com",
  "pix_code": "00020101021226800014br.gov.bcb.pix...",
  "qr_code": "00020101021226800014br.gov.bcb.pix...",
  "expires_at": "2026-04-09T19:55:42Z",
  "provider": "novaera",
  "created_at": "2026-04-07T19:55:40Z"
}`}</pre>

                  <div className="bg-muted/50 border rounded-lg p-3 mt-3">
                    <p className="text-sm"><strong>💡 Campos importantes:</strong></p>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                      <li><code>pix_code</code> — Código copia-e-cola para o cliente pagar no app do banco</li>
                      <li><code>qr_code</code> — Use para gerar a imagem do QR Code no frontend</li>
                      <li><code>expires_at</code> — Data de expiração do PIX (padrão: 1 hora)</li>
                      <li><code>external_id</code> — ID da transação na adquirente</li>
                    </ul>
                  </div>

                  <div className="bg-muted/50 border rounded-lg p-3 mt-3">
                    <p className="text-sm"><strong>📋 Parâmetros aceitos:</strong></p>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                      <li><code>amount</code> (obrigatório) — Valor em reais (máx: 100.000)</li>
                      <li><code>description</code> — Descrição do pagamento</li>
                      <li><code>customer_email</code> — Email do cliente</li>
                      <li><code>webhook_url</code> — URL para receber notificação deste pagamento</li>
                      <li><code>metadata</code> — Objeto JSON com dados extras</li>
                    </ul>
                  </div>
                </div>

                {/* Get Payment */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">🔍 Consultar Pagamento</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">GET</Badge>
                    <code className="text-sm">/payments/:id</code>
                  </div>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`curl ${BASE_URL}/payments/UUID_DO_PAGAMENTO \\
  -H "x-api-key: sk_live_xxx"`}</pre>
                </div>

                {/* List Payments */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">📋 Listar Pagamentos</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">GET</Badge>
                    <code className="text-sm">/payments?status=paid&limit=20&offset=0</code>
                  </div>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`curl "${BASE_URL}/payments?status=pending&limit=10" \\
  -H "x-api-key: sk_live_xxx"`}</pre>
                  <p className="text-sm text-muted-foreground mt-2">Filtros: <code>status</code> (pending, paid, canceled, expired, failed), <code>limit</code> (máx 100), <code>offset</code></p>
                </div>

                {/* Update Status */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">✏️ Atualizar Status (manual)</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">PATCH</Badge>
                    <code className="text-sm">/payments/:id/status</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Normalmente o status é atualizado automaticamente quando o PIX é pago. Use este endpoint apenas para override manual.</p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`curl -X PATCH ${BASE_URL}/payments/UUID/status \\
  -H "x-api-key: sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "canceled"}'`}</pre>
                  <p className="text-sm text-muted-foreground mt-2">Status válidos: <code>pending</code>, <code>paid</code>, <code>canceled</code>, <code>expired</code>, <code>failed</code></p>
                </div>

                {/* JavaScript Example */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">🟨 Exemplo JavaScript</h3>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`const response = await fetch('${BASE_URL}/payments', {
  method: 'POST',
  headers: {
    'x-api-key': 'sk_live_sua_chave',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 99.90,
    description: 'Assinatura mensal',
    customer_email: 'cliente@email.com',
    webhook_url: 'https://seusite.com/webhook',
  }),
});

const payment = await response.json();

// Exibir QR Code para o cliente
console.log('PIX Copia e Cola:', payment.pix_code);
console.log('Expira em:', payment.expires_at);

// Gerar QR Code no frontend (usando qualquer lib de QR Code)
// generateQRCode(payment.qr_code);`}</pre>
                </div>

                {/* Webhook */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">🔔 Webhook — Notificação de Pagamento</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Quando o cliente paga o PIX, enviamos automaticamente um POST para sua <code>webhook_url</code> e para os webhooks configurados no dashboard:
                  </p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`{
  "event": "payment.paid",
  "payment": {
    "id": "73a95625-edbe-45c9-9fad-e1d1f277e87c",
    "amount": 49.90,
    "status": "paid",
    "paid_at": "2026-04-07T20:01:30Z"
  }
}`}</pre>
                  <p className="text-sm text-muted-foreground mt-2">
                    Webhooks configurados no dashboard incluem o header <code>X-Treex-Signature</code> (HMAC SHA-256) para validação.
                  </p>
                </div>

                {/* Flow diagram */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">📊 Fluxo Completo</h3>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`Seu Sistema              TreexPay                 Adquirente
    │                        │                        │
    ├── POST /payments ─────>│                        │
    │                        ├── Gera PIX real ──────>│
    │                        │<── pix_code + qr ─────┤
    │<── 201 + dados PIX ───┤                        │
    │                        │                        │
    │  (cliente paga)        │                        │
    │                        │<── webhook: pago ─────┤
    │                        ├── Credita saldo        │
    │<── webhook: paid ─────┤                        │
    │                        │                        │`}</pre>
                </div>

                {/* Health */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">🏥 Health Check (público)</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">GET</Badge>
                    <code className="text-sm">/health</code>
                  </div>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`curl ${BASE_URL}/health`}</pre>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto mt-2">{`{
  "status": "ok",
  "service": "TreexPay API Gateway",
  "version": "2.0.0",
  "features": ["pix"],
  "timestamp": "2026-04-07T19:55:30Z"
}`}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
