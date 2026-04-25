
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Bitcoin, QrCode, Copy } from "lucide-react";
import { Withdrawal } from "@/hooks/useWithdrawals";
import { useToast } from "@/hooks/use-toast";

interface AdminWithdrawalsTableProps {
  withdrawals: Withdrawal[];
  onApprove: (id: string) => Promise<boolean>;
  onReject: (id: string) => Promise<boolean>;
  loading: boolean;
}

export const AdminWithdrawalsTable = ({ 
  withdrawals, 
  onApprove, 
  onReject, 
  loading 
}: AdminWithdrawalsTableProps) => {
  const { toast } = useToast();

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copiado!', description: `${label} copiado para a área de transferência.` });
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

  const getStatusBadge = (status: Withdrawal['status']) => {
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

  const formatPixKeyType = (type: string) => {
    const types = {
      'email': 'E-mail',
      'phone': 'Telefone',
      'cpf': 'CPF',
      'cnpj': 'CNPJ',
      'random_key': 'Chave Aleatória',
      'btc': 'Bitcoin (BTC)',
    };
    return types[type as keyof typeof types] || type;
  };

  const isBtc = (type: string) => type === 'btc';

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
            <TableHead>Método</TableHead>
            <TableHead>Chave / Endereço</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((withdrawal) => (
            <TableRow key={withdrawal.id}>
              <TableCell className="font-medium">
                {withdrawal.user_name || 'Nome não encontrado'}
              </TableCell>
              <TableCell>{withdrawal.user_email || 'Email não encontrado'}</TableCell>
              <TableCell className="font-semibold text-primary">
                {formatCurrency(withdrawal.amount)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {isBtc(withdrawal.pix_key_type) ? (
                    <Bitcoin className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <QrCode className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span>{formatPixKeyType(withdrawal.pix_key_type)}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-[360px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`break-all ${isBtc(withdrawal.pix_key_type) ? 'font-mono text-xs' : ''}`}
                    title={withdrawal.pix_key}
                  >
                    {withdrawal.pix_key}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleCopy(withdrawal.pix_key, isBtc(withdrawal.pix_key_type) ? 'Endereço BTC' : 'Chave PIX')}
                    title="Copiar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
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
                        className="bg-treexpay-green hover:bg-treexpay-green/80"
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
