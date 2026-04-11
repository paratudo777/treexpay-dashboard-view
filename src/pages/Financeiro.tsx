
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawalForm } from "@/components/WithdrawalForm";
import { useUserBalance } from "@/hooks/useUserBalance";
import { useWithdrawals } from "@/hooks/useWithdrawals";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, XCircle, TrendingUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Financeiro() {
  const { balance, loading: balanceLoading, refetch } = useUserBalance();
  const { withdrawals, loading: withdrawalsLoading } = useWithdrawals();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleWithdrawalSuccess = () => {
    refetch();
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'requested');
  const processedWithdrawals = withdrawals.filter(w => w.status === 'processed');
  const rejectedWithdrawals = withdrawals.filter(w => w.status === 'rejected');

  const totalWithdrawn = processedWithdrawals.reduce((acc, w) => acc + w.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'processed':
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Processado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl gradient-primary">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Gerencie seu saldo, saques e movimentações</p>
          </div>
        </div>

        {/* Balance & Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Saldo Disponível */}
          <Card className="glass-card col-span-1 md:col-span-2 lg:col-span-1 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
            <div className="absolute inset-0 gradient-primary opacity-[0.04] group-hover:opacity-[0.08] transition-opacity" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Saldo Disponível</p>
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground tracking-tight">
                {balanceLoading ? (
                  <span className="inline-block h-9 w-40 bg-muted animate-pulse rounded-lg" />
                ) : (
                  formatCurrency(balance)
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Atualizado em tempo real</p>
            </CardContent>
          </Card>

          {/* Total Sacado */}
          <Card className="glass-card group hover:border-emerald-500/30 transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Sacado</p>
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <ArrowUpFromLine className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalWithdrawn)}</p>
              <p className="text-xs text-emerald-400 mt-1">{processedWithdrawals.length} saques processados</p>
            </CardContent>
          </Card>

          {/* Pendentes */}
          <Card className="glass-card group hover:border-yellow-500/30 transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <div className="p-1.5 rounded-lg bg-yellow-500/10">
                  <Clock className="h-4 w-4 text-yellow-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{pendingWithdrawals.length}</p>
              <p className="text-xs text-yellow-400 mt-1">Aguardando aprovação</p>
            </CardContent>
          </Card>

          {/* Volume */}
          <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total de Saques</p>
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{withdrawals.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Todas as solicitações</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Formulário de saque */}
          <div className="lg:col-span-2">
            <WithdrawalForm balance={balance} onWithdrawalSuccess={handleWithdrawalSuccess} />
          </div>

          {/* Histórico de saques */}
          <div className="lg:col-span-3">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Histórico de Saques</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                      <ArrowUpFromLine className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium">Nenhum saque realizado</p>
                    <p className="text-sm text-muted-foreground mt-1">Seus saques aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {withdrawals.slice(0, 20).map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            withdrawal.status === 'processed' ? 'bg-emerald-500/10' :
                            withdrawal.status === 'rejected' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                          }`}>
                            {withdrawal.status === 'processed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
                             withdrawal.status === 'rejected' ? <XCircle className="h-4 w-4 text-red-400" /> :
                             <Clock className="h-4 w-4 text-yellow-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {formatCurrency(withdrawal.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {withdrawal.pix_key}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                          {getStatusBadge(withdrawal.status)}
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(withdrawal.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Card */}
        <Card className="glass-card border-primary/10">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3 flex-1">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Depósitos</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Acesse "Depósitos" para adicionar saldo via PIX.</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Saques</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Solicitações passam por análise antes da aprovação.</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Transações</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Veja o histórico completo na seção "Transações".</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
