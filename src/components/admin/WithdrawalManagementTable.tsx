
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, CreditCard, Bitcoin, QrCode, Copy } from "lucide-react";
import { WithdrawalRequest } from "@/types/withdrawal";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copiado!', description: `${label} copiado.` });
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível copiar.' });
    }
  };
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
            <TableHead>Método / Destino</TableHead>
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
              <TableCell className="font-semibold text-primary">
                {formatCurrency(request.amount)}
              </TableCell>
              <TableCell className="max-w-[360px]">
                {(() => {
                  const isBtc = request.pixKeyType?.toLowerCase() === 'btc';
                  return (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1.5 font-medium">
                        {isBtc ? (
                          <Bitcoin className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <QrCode className="h-3.5 w-3.5 text-primary" />
                        )}
                        {isBtc ? 'Bitcoin (BTC)' : request.pixKeyType}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-muted-foreground break-all ${isBtc ? 'font-mono text-xs' : ''}`}
                          title={request.pixKey}
                        >
                          {request.pixKey}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleCopy(request.pixKey, isBtc ? 'Endereço BTC' : 'Chave PIX')}
                          title="Copiar"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })()}
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
