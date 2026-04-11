import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Webhook, Edit2, Clock, AlertCircle, Globe, Zap, Send } from 'lucide-react';
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
    if (expandedLogs === webhookId) { setExpandedLogs(null); return; }
    const { data } = await supabase
      .from('webhook_logs' as any)
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(10);
    setLogs((data as any[]) || []);
    setExpandedLogs(webhookId);
  };

  const openAdd = () => { setFormUrl(''); setFormEvents([]); setEditingWebhook(null); setShowAddModal(true); };
  const openEdit = (wh: WebhookRow) => { setFormUrl(wh.url); setFormEvents([...wh.events]); setEditingWebhook(wh); setShowAddModal(true); };

  const toggleEvent = (event: string) => {
    setFormEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  const handleSave = async () => {
    if (!formUrl.trim()) { toast({ title: 'URL obrigatória', variant: 'destructive' }); return; }
    try { new URL(formUrl); } catch { toast({ title: 'URL inválida', variant: 'destructive' }); return; }
    if (formEvents.length === 0) { toast({ title: 'Selecione pelo menos um evento', variant: 'destructive' }); return; }
    setSaving(true);
    if (editingWebhook) {
      const { error } = await supabase.from('webhooks' as any).update({ url: formUrl.trim(), events: formEvents } as any).eq('id', editingWebhook.id);
      if (error) { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); }
      else { toast({ title: 'Webhook atualizado!' }); setShowAddModal(false); loadWebhooks(); }
    } else {
      if (webhooks.length >= 5) { toast({ title: 'Limite atingido', description: 'Máximo de 5 webhooks.', variant: 'destructive' }); setSaving(false); return; }
      const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
      const { error } = await supabase.from('webhooks' as any).insert({ user_id: user!.id, url: formUrl.trim(), events: formEvents, secret, is_active: true } as any);
      if (error) { toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' }); }
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
            <p className="text-sm text-muted-foreground">Receba notificações em tempo real sobre eventos da sua conta.</p>
          </div>
        </div>
        <Button
          onClick={openAdd}
          disabled={webhooks.length >= 5}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4 mr-2" />Adicionar Webhook
        </Button>
      </div>

      {/* Webhook List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="border border-dashed border-white/[0.08] rounded-2xl p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Webhook className="h-8 w-8 text-primary/50" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Nenhum webhook configurado</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Adicione um webhook para receber eventos em tempo real no seu servidor.
          </p>
          <Button
            onClick={openAdd}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />Adicionar Webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(wh => (
            <div
              key={wh.id}
              className={cn(
                "rounded-2xl border border-white/[0.06] bg-[hsl(260,20%,8%)] overflow-hidden",
                "hover:border-primary/20 transition-all duration-300",
                "hover:shadow-lg hover:shadow-primary/5"
              )}
            >
              <div className="p-5">
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                      wh.is_active
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-muted/50 border border-white/[0.06]"
                    )}>
                      <Globe className={cn("h-4 w-4", wh.is_active ? "text-green-400" : "text-muted-foreground")} />
                    </div>
                    <div className="min-w-0">
                      <code className="text-sm font-mono text-foreground break-all select-none">{wh.url}</code>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium border",
                            wh.is_active
                              ? "text-green-400 border-green-500/30 bg-green-500/10"
                              : "text-muted-foreground border-white/[0.06]"
                          )}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full mr-1.5",
                            wh.is_active ? "bg-green-400 animate-pulse" : "bg-muted-foreground"
                          )} />
                          {wh.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground/60">
                          Criado {timeAgo(wh.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    <Switch
                      checked={wh.is_active}
                      onCheckedChange={(v) => toggleActive(wh.id, v)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                </div>

                {/* Events */}
                <div className="mb-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 block">Eventos</span>
                  <div className="flex flex-wrap gap-1.5">
                    {wh.events.length === 0 ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Nenhum evento
                      </span>
                    ) : (
                      wh.events.map(ev => (
                        <Badge
                          key={ev}
                          variant="outline"
                          className="text-[11px] font-mono bg-primary/5 border-primary/20 text-primary/80 hover:bg-primary/10 transition-colors"
                        >
                          {ev}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.04]">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(wh)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => loadLogs(wh.id)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />Logs
                  </Button>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteWebhook(wh.id)}
                    className="h-8 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Deletar
                  </Button>
                </div>
              </div>

              {/* Logs panel */}
              {expandedLogs === wh.id && (
                <div className="border-t border-white/[0.04] p-5 bg-[hsl(260,20%,6%)]">
                  <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Últimos Logs
                  </h4>
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">Nenhum log encontrado.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {logs.map((log: any) => (
                        <div key={log.id} className="flex items-center gap-3 text-xs border border-white/[0.04] rounded-lg p-2.5 bg-white/[0.02]">
                          <Badge variant="outline" className={cn("text-[10px] font-mono", getStatusColor(log.response_status))}>
                            {log.response_status || '—'}
                          </Badge>
                          <span className="font-mono text-muted-foreground">{log.event}</span>
                          <span className="text-muted-foreground/50 ml-auto text-[10px]">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </span>
                          {log.attempt > 1 && (
                            <Badge variant="secondary" className="text-[10px]">retry #{log.attempt}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground/50 text-right">{webhooks.length}/5 webhooks</p>
        </div>
      )}

      {/* Payload Example */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" /> Exemplo de Payload
        </h3>
        <CopyBlock
          label="POST"
          content={`POST https://seusite.com/webhook
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
}`}
        />
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg bg-[hsl(260,20%,8%)] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              {editingWebhook ? 'Editar Webhook' : 'Adicionar Webhook'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">URL do Webhook</Label>
              <Input
                placeholder="https://seusite.com/webhook/treexpay"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Eventos</Label>
              <p className="text-[11px] text-muted-foreground/60">Selecione os eventos que deseja receber.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <label
                    key={ev.value}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                      formEvents.includes(ev.value)
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-white/[0.06] hover:border-primary/20 bg-white/[0.02]'
                    )}
                  >
                    <Checkbox
                      checked={formEvents.includes(ev.value)}
                      onCheckedChange={() => toggleEvent(ev.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">{ev.label}</span>
                      <p className="text-[11px] text-muted-foreground/60">{ev.description}</p>
                      <code className="text-[10px] text-primary/60 font-mono">{ev.value}</code>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-white/[0.08]">Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0"
            >
              {saving ? 'Salvando...' : editingWebhook ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
