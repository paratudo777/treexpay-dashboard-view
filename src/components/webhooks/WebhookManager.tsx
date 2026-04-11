import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Webhook, Edit2, Clock, AlertCircle, Globe, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CopyBlock } from '@/components/api/CopyBlock';
import { cn } from '@/lib/utils';

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
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) loadWebhooks(); }, [user]);

  const loadWebhooks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('webhooks' as any).select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    if (!error && data) {
      setWebhooks((data as any[]).map((w: any) => ({ ...w, events: Array.isArray(w.events) ? w.events : [] })));
    }
    setLoading(false);
  };

  const loadLogs = async (webhookId: string) => {
    if (expandedLogs === webhookId) { setExpandedLogs(null); return; }
    const { data } = await supabase.from('webhook_logs' as any).select('*').eq('webhook_id', webhookId).order('created_at', { ascending: false }).limit(10);
    setLogs((data as any[]) || []);
    setExpandedLogs(webhookId);
  };

  const openAdd = () => { setFormUrl(''); setFormEvents([]); setEditingWebhook(null); setShowAddModal(true); };
  const openEdit = (wh: WebhookRow) => { setFormUrl(wh.url); setFormEvents([...wh.events]); setEditingWebhook(wh); setShowAddModal(true); };
  const toggleEvent = (event: string) => { setFormEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]); };

  const handleSave = async () => {
    if (!formUrl.trim()) { toast({ title: 'URL obrigatória', variant: 'destructive' }); return; }
    try { new URL(formUrl); } catch { toast({ title: 'URL inválida', variant: 'destructive' }); return; }
    if (formEvents.length === 0) { toast({ title: 'Selecione pelo menos um evento', variant: 'destructive' }); return; }
    setSaving(true);
    if (editingWebhook) {
      const { error } = await supabase.from('webhooks' as any).update({ url: formUrl.trim(), events: formEvents } as any).eq('id', editingWebhook.id);
      if (error) toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Webhook atualizado!' }); setShowAddModal(false); loadWebhooks(); }
    } else {
      if (webhooks.length >= 5) { toast({ title: 'Limite atingido', description: 'Máximo de 5 webhooks.', variant: 'destructive' }); setSaving(false); return; }
      const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
      const { error } = await supabase.from('webhooks' as any).insert({ user_id: user!.id, url: formUrl.trim(), events: formEvents, secret, is_active: true } as any);
      if (error) toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Webhook adicionado!' }); setShowAddModal(false); loadWebhooks(); }
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
    if (status >= 200 && status < 300) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (status >= 400) return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Webhook className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Webhooks</h2>
            <p className="text-sm text-muted-foreground">Receba notificações em tempo real sobre eventos.</p>
          </div>
        </div>
        <Button onClick={openAdd} disabled={webhooks.length >= 5} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
          <Plus className="h-4 w-4 mr-2" />Adicionar Webhook
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-card">
          <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-base font-semibold text-foreground mb-1">Nenhum webhook configurado</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Adicione um webhook para receber eventos em tempo real no seu servidor.
          </p>
          <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="h-4 w-4 mr-2" />Adicionar Webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(wh => (
            <div key={wh.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all duration-300">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                      wh.is_active ? "bg-green-500/10 border border-green-500/20" : "bg-muted border border-border"
                    )}>
                      <Globe className={cn("h-4 w-4", wh.is_active ? "text-green-400" : "text-muted-foreground")} />
                    </div>
                    <div className="min-w-0">
                      <code className="text-sm font-mono text-foreground break-all">{wh.url}</code>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-[10px] font-medium", wh.is_active ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-muted-foreground")}>
                          <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", wh.is_active ? "bg-green-400 animate-pulse" : "bg-muted-foreground")} />
                          {wh.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Criado {timeAgo(wh.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Switch checked={wh.is_active} onCheckedChange={(v) => toggleActive(wh.id, v)} />
                </div>

                <div className="mb-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 block">EVENTOS</span>
                  <div className="flex flex-wrap gap-1.5">
                    {wh.events.length === 0 ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Nenhum evento</span>
                    ) : wh.events.map(ev => (
                      <Badge key={ev} variant="outline" className="text-[11px] font-mono bg-primary/5 border-primary/20 text-primary">{ev}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => openEdit(wh)} className="h-8 text-xs">
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => loadLogs(wh.id)} className="h-8 text-xs">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />Logs
                  </Button>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={() => deleteWebhook(wh.id)} className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Deletar
                  </Button>
                </div>
              </div>

              {expandedLogs === wh.id && (
                <div className="border-t border-border p-5 bg-muted/30">
                  <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Últimos Logs
                  </h4>
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum log encontrado.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {logs.map((log: any) => (
                        <div key={log.id} className="flex items-center gap-3 text-xs border border-border rounded-lg p-2.5 bg-card">
                          <Badge variant="outline" className={cn("text-[10px] font-mono", getStatusColor(log.response_status))}>
                            {log.response_status || '—'}
                          </Badge>
                          <span className="font-mono text-muted-foreground">{log.event}</span>
                          <span className="text-muted-foreground ml-auto text-[10px]">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                          {log.attempt > 1 && <Badge variant="secondary" className="text-[10px]">retry #{log.attempt}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-right">{webhooks.length}/5 webhooks</p>
        </div>
      )}

      {/* Payload Example */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" /> Exemplo de Payload
        </h3>
        <CopyBlock content={`POST https://seusite.com/webhook
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
}`} />
      </div>

      {/* Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              {editingWebhook ? 'Editar Webhook' : 'Adicionar Webhook'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">URL DO WEBHOOK</Label>
              <Input placeholder="https://seusite.com/webhook/treexpay" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">EVENTOS</Label>
              <p className="text-[11px] text-muted-foreground">Selecione os eventos que deseja receber.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <label key={ev.value} className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                    formEvents.includes(ev.value) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  )}>
                    <Checkbox checked={formEvents.includes(ev.value)} onCheckedChange={() => toggleEvent(ev.value)} className="mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-foreground">{ev.label}</span>
                      <p className="text-[11px] text-muted-foreground">{ev.description}</p>
                      <code className="text-[10px] text-primary/70 font-mono">{ev.value}</code>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              {saving ? 'Salvando...' : editingWebhook ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
