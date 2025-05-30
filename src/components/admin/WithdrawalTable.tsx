
import { useWithdrawals } from "@/hooks/useWithdrawals";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WithdrawalRow } from "./WithdrawalRow";
import { Loader2 } from "lucide-react";

export const WithdrawalTable = () => {
  const { withdrawals, loading, actionLoading, approveWithdrawal, rejectWithdrawal } = useWithdrawals();

  const handleApprove = (id: string, amount: number) => {
    approveWithdrawal(id, amount);
  };

  const handleReject = (id: string) => {
    rejectWithdrawal(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-treexpay-medium" />
        <span className="ml-2 text-lg">Carregando solicitações...</span>
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-lg text-muted-foreground">
          Nenhuma solicitação de saque encontrada.
        </p>
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
              onApprove={handleApprove}
              onReject={handleReject}
              isLoading={actionLoading === withdrawal.id}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
