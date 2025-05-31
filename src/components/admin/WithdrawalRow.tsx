
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { WithdrawalStatusBadge } from "./WithdrawalStatusBadge";
import { Check, X, Loader2 } from "lucide-react";
import { Withdrawal } from "@/hooks/useWithdrawals";

interface WithdrawalRowProps {
  withdrawal: Withdrawal;
  onApprove: (id: string, amount: number) => void;
  onReject: (id: string) => void;
  isLoading?: boolean;
}

export const WithdrawalRow = ({ withdrawal, onApprove, onReject, isLoading }: WithdrawalRowProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPixKeyType = (type: string) => {
    const types = {
      'email': 'E-mail',
      'telefone': 'Telefone',
      'cpf': 'CPF',
      'chave_aleatoria': 'Chave Aleatória'
    };
    return types[type as keyof typeof types] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canPerformActions = withdrawal.status === 'requested';

  return (
    <TableRow>
      <TableCell className="font-medium">{withdrawal.name}</TableCell>
      <TableCell>{withdrawal.email}</TableCell>
      <TableCell className="font-semibold text-treexpay-medium">
        {formatCurrency(withdrawal.amount)}
      </TableCell>
      <TableCell>{formatPixKeyType(withdrawal.pix_key_type)}</TableCell>
      <TableCell className="max-w-[200px] truncate" title={withdrawal.pix_key}>
        {withdrawal.pix_key}
      </TableCell>
      <TableCell>
        <WithdrawalStatusBadge status={withdrawal.status} />
      </TableCell>
      <TableCell>{formatDate(withdrawal.request_date)}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          {canPerformActions && (
            <>
              <Button
                size="sm"
                onClick={() => onApprove(withdrawal.id, withdrawal.amount)}
                disabled={isLoading}
                className="bg-treexpay-green hover:bg-treexpay-green/80"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReject(withdrawal.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Rejeitar
              </Button>
            </>
          )}
          {!canPerformActions && (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
