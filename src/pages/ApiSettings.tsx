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
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5 text-primary" />Configurar Webhook</CardTitle>
                <CardDescription>Receba notificações automáticas quando pagamentos forem aprovados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://seusite.com/webhook/treexpay"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                  />
                  <Button onClick={addWebhook} disabled={savingWebhook}>
                    <Plus className="h-4 w-4 mr-2" />Adicionar
                  </Button>
                </div>

                {webhooks.length > 0 ? (
                  <div className="space-y-3">
                    {webhooks.map(wh => (
                      <div key={wh.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex-1 min-w-0">
                          <code className="text-sm font-mono break-all">{wh.url}</code>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={wh.is_active ? 'default' : 'secondary'} className="text-xs">
                              {wh.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Switch checked={wh.is_active} onCheckedChange={(v) => toggleWebhook(wh.id, v)} />
                          <Button size="icon" variant="ghost" onClick={() => deleteWebhook(wh.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum webhook configurado.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Payload do Webhook</CardTitle></CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">{`POST https://seusite.com/webhook/treexpay
Content-Type: application/json

{
  "event": "payment.paid",
  "payment": {
    "id": "uuid-do-pagamento",
    "amount": 150.00,
    "status": "paid",
    "paid_at": "2026-04-07T18:00:00Z"
  }
}`}</pre>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DOCS TAB ── */}
          <TabsContent value="docs" className="space-y-4 mt-4">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" />Documentação da API</CardTitle>
                <CardDescription>Integre a TreexPay no seu site em minutos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auth */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">🔐 Autenticação</h3>
                  <p className="text-sm text-muted-foreground mb-2">Todas as requisições devem incluir sua Secret Key no header:</p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`x-api-key: sk_live_sua_chave_aqui

// ou
Authorization: Bearer sk_live_sua_chave_aqui`}</pre>
                </div>

                {/* Create Payment */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">💳 Criar Pagamento</h3>
                  <Badge className="mb-2">POST</Badge>
                  <code className="ml-2 text-sm">/payments</code>
                  
                  <p className="text-sm text-muted-foreground mt-2 mb-2"><strong>cURL:</strong></p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`curl -X POST ${BASE_URL}/payments \\
  -H "x-api-key: ${apiKeys?.secret_key ? apiKeys.secret_key.substring(0, 16) + '...' : 'sk_live_xxx'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 150.00,
    "description": "Pedido #123",
    "customer_email": "cliente@email.com",
    "webhook_url": "https://seusite.com/webhook"
  }'`}</pre>

                  <p className="text-sm text-muted-foreground mt-3 mb-2"><strong>Resposta (201):</strong></p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`{
  "id": "uuid-do-pagamento",
  "amount": 150.00,
  "status": "pending",
  "description": "Pedido #123",
  "customer_email": "cliente@email.com",
  "created_at": "2026-04-07T18:00:00Z"
}`}</pre>
                </div>

                {/* Get Payment */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">🔍 Consultar Pagamento</h3>
                  <Badge variant="secondary" className="mb-2">GET</Badge>
                  <code className="ml-2 text-sm">/payments/:id</code>
                  
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto mt-2">{`curl ${BASE_URL}/payments/UUID_DO_PAGAMENTO \\
  -H "x-api-key: sk_live_xxx"`}</pre>
                </div>

                {/* List Payments */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">📋 Listar Pagamentos</h3>
                  <Badge variant="secondary" className="mb-2">GET</Badge>
                  <code className="ml-2 text-sm">/payments?status=paid&limit=20&offset=0</code>
                  
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto mt-2">{`curl "${BASE_URL}/payments?status=pending&limit=10" \\
  -H "x-api-key: sk_live_xxx"`}</pre>
                </div>

                {/* Update Status */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">✏️ Atualizar Status</h3>
                  <Badge variant="outline" className="mb-2">PATCH</Badge>
                  <code className="ml-2 text-sm">/payments/:id/status</code>
                  
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto mt-2">{`curl -X PATCH ${BASE_URL}/payments/UUID/status \\
  -H "x-api-key: sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "paid"}'`}</pre>
                  <p className="text-sm text-muted-foreground mt-2">Status válidos: <code>pending</code>, <code>paid</code>, <code>canceled</code>, <code>expired</code></p>
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
  }),
});

const payment = await response.json();
console.log(payment.id, payment.status);`}</pre>
                </div>

                {/* Webhook */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">🔔 Webhook</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Quando um pagamento muda para <code>paid</code>, enviamos um POST para sua URL de webhook com:
                  </p>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto">{`{
  "event": "payment.paid",
  "payment": {
    "id": "uuid",
    "amount": 150.00,
    "status": "paid",
    "paid_at": "2026-04-07T18:00:00Z"
  }
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
