
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { Withdrawal } from "@/hooks/useWithdrawals";

interface AdminWithdrawalsTableProps {
  withdrawals: Withdrawal[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading?: boolean;
}

export const AdminWithdrawalsTable = ({ 
  withdrawals, 
  onApprove, 
  onReject,
  loading = false
}: AdminWithdrawalsTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  const formatPixKeyType = (type: string) => {
    const types = {
      'email': 'E-mail',
      'phone': 'Telefone',
      'cpf': 'CPF',
      'random_key': 'Chave Aleatória'
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'processed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Processado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium mx-auto mb-4"></div>
        <p className="text-muted-foreground">Carregando saques...</p>
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhuma solicitação de saque encontrada.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Tipo PIX</TableHead>
            <TableHead>Chave PIX</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((withdrawal) => (
            <TableRow key={withdrawal.id}>
              <TableCell className="font-medium">
                {withdrawal.user_name || 'Nome não disponível'}
              </TableCell>
              <TableCell>{withdrawal.user_email || 'Email não disponível'}</TableCell>
              <TableCell className="font-semibold text-treexpay-medium">
                {formatCurrency(withdrawal.amount)}
              </TableCell>
              <TableCell>{formatPixKeyType(withdrawal.pix_key_type)}</TableCell>
              <TableCell className="max-w-[200px]">
                <div className="text-sm truncate" title={withdrawal.pix_key}>
                  {withdrawal.pix_key}
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(withdrawal.status)}
              </TableCell>
              <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {withdrawal.status === 'requested' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onApprove(withdrawal.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onReject(withdrawal.id)}
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    </>
                  )}
                  {withdrawal.status !== 'requested' && (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
