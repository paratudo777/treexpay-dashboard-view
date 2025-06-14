
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, CreditCard } from "lucide-react";
import { WithdrawalRequest } from "@/types/withdrawal";

interface WithdrawalManagementTableProps {
  requests: WithdrawalRequest[];
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onConfirmPayment: (id: string) => void;
}

export const WithdrawalManagementTable = ({ 
  requests, 
  onApprove, 
  onDeny, 
  onConfirmPayment 
}: WithdrawalManagementTableProps) => {
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

  const getStatusBadge = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aprovada</Badge>;
      case 'denied':
        return <Badge variant="destructive">Negada</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Paga</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhuma solicitação de saque encontrada para hoje.</p>
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
            <TableHead>Chave PIX</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.userName}</TableCell>
              <TableCell>{request.userEmail}</TableCell>
              <TableCell className="font-semibold text-treexpay-medium">
                {formatCurrency(request.amount)}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <div className="text-sm">
                  <div className="font-medium">{request.pixKeyType}</div>
                  <div className="text-muted-foreground truncate" title={request.pixKey}>
                    {request.pixKey}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(request.status)}
              </TableCell>
              <TableCell>{formatDate(request.requestedAt)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeny(request.id)}
                      >
                        <X className="h-4 w-4" />
                        Negar
                      </Button>
                    </>
                  )}
                  {request.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => onConfirmPayment(request.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CreditCard className="h-4 w-4" />
                      Confirmar Pagamento
                    </Button>
                  )}
                  {(request.status === 'denied' || request.status === 'paid') && (
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
