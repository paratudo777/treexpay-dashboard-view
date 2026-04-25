
import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, ArrowRightLeft, Loader2, Filter, Calendar, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function AdminTransactions() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [searchId, setSearchId] = useState('');
  const [dateFrom, setDateFrom] = useState(oneWeekAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState('');
  const { toast } = useToast();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApprove = async (tx: any) => {
    if (!confirm(`Aprovar manualmente esta transação de R$ ${Number(tx.amount).toFixed(2)} e creditar o saldo do usuário?`)) return;
    try {
      setApprovingId(tx.id);
      const { data, error } = await supabase.functions.invoke('admin-approve-deposit', {
        body: tx.deposit_id ? { depositId: tx.deposit_id } : { transactionId: tx.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Transação aprovada', description: `Saldo creditado: R$ ${(data as any)?.credited?.toFixed?.(2) ?? ''}` });
      refetch();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao aprovar', variant: 'destructive' });
    } finally {
      setApprovingId(null);
    }
  };

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-transactions', dateFrom, dateTo, typeFilter, statusFilter, userFilter, searchId],
    queryFn: async () => {
      // Se tem busca por ID, ignora filtro de datas
      const isSearchingById = searchId.trim().length > 0;

      let query = supabase
        .from('transactions')
        .select('*, profiles!transactions_user_id_fkey(name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!isSearchingById) {
        query = query
          .gte('created_at', `${dateFrom}T00:00:00`)
          .lte('created_at', `${dateTo}T23:59:59`);
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as any);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) {
        toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar transações." });
        throw error;
      }
      return data || [];
    }
  });

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (userFilter.trim()) {
      result = result.filter((t: any) => {
        const profile = t.profiles;
        return profile?.name?.toLowerCase().includes(userFilter.toLowerCase()) ||
               profile?.email?.toLowerCase().includes(userFilter.toLowerCase());
      });
    }
    if (searchId.trim()) {
      result = result.filter((t: any) => t.id.toLowerCase().includes(searchId.toLowerCase()) || t.code?.toLowerCase().includes(searchId.toLowerCase()));
    }
    return result;
  }, [transactions, userFilter, searchId]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    refunded: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    denied: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const typeLabels: Record<string, string> = {
    payment: 'Pagamento',
    withdrawal: 'Saque',
    deposit: 'Depósito',
    refund: 'Reembolso',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
    denied: 'Negado',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transações (Admin)</h1>
            <p className="text-sm text-muted-foreground">Visualize e filtre todas as transações da plataforma</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por ID..." value={searchId} onChange={e => setSearchId(e.target.value)} className="pl-10 bg-background/50" />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-background/50" />
              </div>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-background/50" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="payment">Pagamento</SelectItem>
                  <SelectItem value="deposit">Depósito</SelectItem>
                  <SelectItem value="withdrawal">Saque</SelectItem>
                  <SelectItem value="refund">Reembolso</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="denied">Negado</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Filtrar por usuário (nome ou e-mail)..." value={userFilter} onChange={e => setUserFilter(e.target.value)} className="pl-10 bg-background/50" />
              </div>
              <Button variant="outline" onClick={() => refetch()} className="shrink-0">Buscar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/30 pb-4">
            <CardTitle className="text-lg">{filteredTransactions.length} transações encontradas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Carregando...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground">Nenhuma transação encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">ID</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Usuário</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Valor</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Descrição</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Data</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx: any, i: number) => (
                      <TableRow key={tx.id} className="border-border/20 hover:bg-primary/5 transition-colors" style={{ animationDelay: `${i * 20}ms` }}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{tx.code || tx.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{tx.profiles?.name || '—'}</p>
                            <p className="text-xs text-muted-foreground">{tx.profiles?.email || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{typeLabels[tx.type] || tx.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${statusColors[tx.status] || ''}`}>{statusLabels[tx.status] || tx.status}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-sm">R$ {Number(tx.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{tx.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(tx.created_at)}</TableCell>
                        <TableCell>
                          {tx.status === 'pending' && tx.type === 'deposit' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={approvingId === tx.id}
                              onClick={() => handleApprove(tx)}
                              className="h-8 px-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                              {approvingId === tx.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar</>
                              )}
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
