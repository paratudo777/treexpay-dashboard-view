import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Webhook, Edit2, X, Check, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const AVAILABLE_EVENTS = [
  { value: 'pix.generated', label: 'Pix Gerado', description: 'Quando um PIX é criado' },
  { value: 'boleto.generated', label: 'Boleto Gerado', description: 'Quando um boleto é criado' },
  { value: 'payment.paid', label: 'Compra Aprovada', description: 'Quando um pagamento é confirmado' },
  { value: 'payment.refused', label: 'Compra Recusada', description: 'Quando um pagamento é negado' },
  { value: 'payment.processing', label: 'Pagamento Processando', description: 'Quando o pagamento entra em processamento' },
  { value: 'payment.refunded', label: 'Estorno', description: 'Quando um pagamento é estornado' },
  { value: 'payment.chargeback', label: 'Chargeback', description: 'Quando ocorre chargeback' },
  { value: 'checkout.abandoned', label: 'Carrinho Abandonado', description: 'Quando checkout é abandonado' },
] as const;

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function WebhookManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookRow | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadWebhooks();
  }, [user]);

  const loadWebhooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhooks' as any)
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWebhooks((data as any[]).map((w: any) => ({
        ...w,
        events: Array.isArray(w.events) ? w.events : [],
      })));
    }
    setLoading(false);
  };

  const loadLogs = async (webhookId: string) => {
    if (expandedLogs === webhookId) {
      setExpandedLogs(null);
      return;
    }
    const { data } = await supabase
      .from('webhook_logs' as any)
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(10);
    setLogs((data as any[]) || []);
    setExpandedLogs(webhookId);
  };

  const openAdd = () => {
    setFormUrl('');
    setFormEvents([]);
    setEditingWebhook(null);
    setShowAddModal(true);
  };

  const openEdit = (wh: WebhookRow) => {
    setFormUrl(wh.url);
    setFormEvents([...wh.events]);
    setEditingWebhook(wh);
    setShowAddModal(true);
  };

  const toggleEvent = (event: string) => {
    setFormEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  const handleSave = async () => {
    if (!formUrl.trim()) {
      toast({ title: 'URL obrigatória', variant: 'destructive' });
      return;
    }
    try { new URL(formUrl); } catch {
      toast({ title: 'URL inválida', variant: 'destructive' });
      return;
    }
    if (formEvents.length === 0) {
      toast({ title: 'Selecione pelo menos um evento', variant: 'destructive' });
      return;
    }

    setSaving(true);

    if (editingWebhook) {
      const { error } = await supabase
        .from('webhooks' as any)
        .update({ url: formUrl.trim(), events: formEvents } as any)
        .eq('id', editingWebhook.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Webhook atualizado!' });
        setShowAddModal(false);
        loadWebhooks();
      }
    } else {
      if (webhooks.length >= 5) {
        toast({ title: 'Limite atingido', description: 'Máximo de 5 webhooks por conta.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
      const { error } = await supabase
        .from('webhooks' as any)
        .insert({
          user_id: user!.id,
          url: formUrl.trim(),
          events: formEvents,
          secret,
          is_active: true,
        } as any);

      if (error) {
        const msg = error.message.includes('5 webhooks') ? 'Máximo de 5 webhooks por conta.' : error.message;
        toast({ title: 'Erro ao criar', description: msg, variant: 'destructive' });
      } else {
        toast({ title: 'Webhook adicionado!' });
        setShowAddModal(false);
        loadWebhooks();
      }
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('webhooks' as any).update({ is_active: active } as any).eq('id', id);
    loadWebhooks();
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este webhook?')) return;
    await supabase.from('webhooks' as any).delete().eq('id', id);
    loadWebhooks();
    toast({ title: 'Webhook removido' });
  };

  const getStatusColor = (status: number | null) => {
    if (!status) return 'bg-muted text-muted-foreground';
    if (status >= 200 && status < 300) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (status >= 400) return 'bg-red-500/10 text-red-600 border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              Configurar Webhooks
            </CardTitle>
            <CardDescription>
              Receba notificações em tempo real sobre eventos da sua conta. Máximo de 5 webhooks.
            </CardDescription>
          </div>
          <Button onClick={openAdd} disabled={webhooks.length >= 5} size="sm">
            <Plus className="h-4 w-4 mr-2" />Adicionar Webhook
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum webhook configurado.</p>
              <p className="text-xs mt-1">Clique em "Adicionar Webhook" para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map(wh => (
                <div key={wh.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono break-all text-foreground">{wh.url}</code>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {wh.events.map(ev => (
                          <Badge key={ev} variant="outline" className="text-xs font-mono">
                            {ev}
                          </Badge>
                        ))}
                        {wh.events.length === 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Nenhum evento selecionado
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Switch checked={wh.is_active} onCheckedChange={(v) => toggleActive(wh.id, v)} />
                      <Button size="icon" variant="ghost" onClick={() => openEdit(wh)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => loadLogs(wh.id)}>
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteWebhook(wh.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Logs panel */}
                  {expandedLogs === wh.id && (
                    <div className="border-t p-4 bg-background">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Últimos Logs
                      </h4>
                      {logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum log encontrado.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {logs.map((log: any) => (
                            <div key={log.id} className="flex items-center gap-3 text-xs border rounded p-2">
                              <Badge variant="outline" className={`text-xs ${getStatusColor(log.response_status)}`}>
                                {log.response_status || '—'}
                              </Badge>
                              <span className="font-mono text-muted-foreground">{log.event}</span>
                              <span className="text-muted-foreground ml-auto">
                                {new Date(log.created_at).toLocaleString('pt-BR')}
                              </span>
                              {log.attempt > 1 && (
                                <Badge variant="secondary" className="text-xs">retry #{log.attempt}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-right">
                {webhooks.length}/5 webhooks
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payload example */}
      <Card>
        <CardHeader><CardTitle className="text-base">Exemplo de Payload</CardTitle></CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">{`POST https://seusite.com/webhook
Content-Type: application/json
X-Treex-Signature: sha256=abc123...

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

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? 'Editar Webhook' : 'Adicionar Webhook'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                placeholder="https://seusite.com/webhook/treexpay"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Eventos</Label>
              <p className="text-xs text-muted-foreground">Selecione os eventos que deseja receber neste webhook.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <label
                    key={ev.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formEvents.includes(ev.value)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <Checkbox
                      checked={formEvents.includes(ev.value)}
                      onCheckedChange={() => toggleEvent(ev.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium">{ev.label}</span>
                      <p className="text-xs text-muted-foreground">{ev.description}</p>
                      <code className="text-xs text-primary/70">{ev.value}</code>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingWebhook ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
