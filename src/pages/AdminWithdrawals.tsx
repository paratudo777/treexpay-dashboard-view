
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWithdrawals } from "@/hooks/useWithdrawals";
import { AdminWithdrawalsTable } from "@/components/admin/AdminWithdrawalsTable";

export default function AdminWithdrawals() {
  const { 
    withdrawals, 
    loading, 
    approveWithdrawal, 
    rejectWithdrawal, 
    getTodaysWithdrawals,
    getWithdrawalsByStatus 
  } = useWithdrawals();

  const todaysWithdrawals = getTodaysWithdrawals();
  const pendingWithdrawals = getWithdrawalsByStatus('requested');
  const processedWithdrawals = getWithdrawalsByStatus('processed');
  const rejectedWithdrawals = getWithdrawalsByStatus('rejected');

  const handleApprove = async (id: string) => {
    await approveWithdrawal(id);
  };

  const handleReject = async (id: string) => {
    await rejectWithdrawal(id);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-7xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Solicitações de Saque
            </h1>
            <p className="text-lg text-gray-200">
              Gerenciar pedidos de saque de todos os usuários
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaysWithdrawals.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {pendingWithdrawals.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Processadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {processedWithdrawals.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {rejectedWithdrawals.length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listagem de Solicitações</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as solicitações de saque
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminWithdrawalsTable 
                withdrawals={withdrawals}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
