
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawalForm } from "@/components/WithdrawalForm";
import { useUserBalance } from "@/hooks/useUserBalance";

export default function Financeiro() {
  // Usar o hook real do Supabase em vez do localStorage
  const { balance, loading: balanceLoading, refetch } = useUserBalance();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleWithdrawalSuccess = () => {
    // Atualizar interface quando saque for solicitado
    refetch();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Financeiro</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Saldo Disponível</CardTitle>
              <CardDescription>Valor disponível em sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-treexpay-medium">
                {balanceLoading ? 'Carregando...' : formatCurrency(balance)}
              </p>
            </CardContent>
          </Card>

          <WithdrawalForm balance={balance} onWithdrawalSuccess={handleWithdrawalSuccess} />

          <Card>
            <CardHeader>
              <CardTitle>Informações Importantes</CardTitle>
              <CardDescription>
                Sobre seu saldo e transações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Depósitos</h3>
                  <p className="text-sm text-muted-foreground">
                    Acesse a seção "Depósitos" para adicionar saldo à sua conta via PIX.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Saques</h3>
                  <p className="text-sm text-muted-foreground">
                    Solicite saques via PIX. As solicitações passam por análise antes da aprovação.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Transações</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualize o histórico completo de suas transações na seção "Transações".
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
