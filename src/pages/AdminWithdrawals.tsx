
import { DashboardLayout } from "@/components/DashboardLayout";
import { WithdrawalTable } from "@/components/admin/WithdrawalTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminWithdrawals() {
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

          <Card>
            <CardHeader>
              <CardTitle>Listagem de Solicitações</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as solicitações de saque pendentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalTable />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
