
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useLocalTransactions } from "@/hooks/useLocalTransactions";
import { useLocalBalance } from "@/hooks/useLocalBalance";
import { WithdrawalManagementTable } from "@/components/admin/WithdrawalManagementTable";

export default function AdminWithdrawals() {
  const { requests, updateRequest } = useWithdrawalRequests();
  const { updateTransactionStatus } = useLocalTransactions();

  const todaysRequests = requests.filter(req => {
    const today = new Date().toDateString();
    return new Date(req.requestedAt).toDateString() === today;
  });

  const handleApprove = (id: string) => {
    updateRequest(id, { status: 'approved' });
    updateTransactionStatus(id, 'approved');
  };

  const handleDeny = (id: string) => {
    updateRequest(id, { status: 'denied' });
    updateTransactionStatus(id, 'denied');
  };

  const handleConfirmPayment = (id: string) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    // Em um sistema real, você deduziria o saldo do usuário aqui
    // Para este demo, apenas atualizamos o status
    updateRequest(id, { status: 'paid' });
    updateTransactionStatus(id, 'paid');
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-7xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Solicitações de Saque
            </h1>
            <p className="text-lg text-gray-200">
              Gerenciar pedidos de saque dos usuários
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaysRequests.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {todaysRequests.filter(r => r.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {todaysRequests.filter(r => r.status === 'approved').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Processadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {todaysRequests.filter(r => r.status === 'paid').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listagem de Solicitações</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as solicitações de saque de hoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalManagementTable 
                requests={todaysRequests}
                onApprove={handleApprove}
                onDeny={handleDeny}
                onConfirmPayment={handleConfirmPayment}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
