
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WithdrawalRow } from "./WithdrawalRow";
import { useWithdrawals } from "@/hooks/useWithdrawals";

export type WithdrawalStatus = "requested" | "processed" | "rejected";

export interface Withdrawal {
  id: string;
  user_id: string;
  name: string;
  email: string;
  amount: number;
  pix_key_type: string;
  pix_key: string;
  status: WithdrawalStatus;
  request_date: string;
}

export const WithdrawalTable = () => {
  const { withdrawals, loading, actionLoading, approveWithdrawal, rejectWithdrawal } = useWithdrawals();

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Carregando solicitações...</p>
        </div>
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma solicitação de saque encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Tipo Pix</TableHead>
            <TableHead>Chave Pix</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((withdrawal) => (
            <WithdrawalRow
              key={withdrawal.id}
              withdrawal={withdrawal}
              onApprove={approveWithdrawal}
              onReject={rejectWithdrawal}
              isLoading={actionLoading === withdrawal.id}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
