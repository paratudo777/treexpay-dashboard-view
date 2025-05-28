
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { StatusBadge } from '@/components/transactions/StatusBadge';
import { useUserDetails, UserDetails } from '@/hooks/useUserDetails';
import { TransactionStatus } from '@/hooks/useTransactions';

interface UserDetailsModalProps {
  user: UserDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

type StatusFilter = 'all' | TransactionStatus;

export const UserDetailsModal = ({ user, isOpen, onClose }: UserDetailsModalProps) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { userDetails, transactions, loading } = useUserDetails(user?.id || null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (statusFilter === 'all') return true;
    return transaction.status === statusFilter;
  });

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'approved', label: 'Aprovadas' },
    { value: 'cancelled', label: 'Canceladas' },
    { value: 'refunded', label: 'Reembolsadas' }
  ];

  if (!userDetails) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center p-8">
            <div className="text-muted-foreground">
              {loading ? 'Carregando dados do usuário...' : 'Usuário não encontrado'}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Usuário</DialogTitle>
          <DialogDescription>
            Visualize todas as informações e transações do usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados do Perfil */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                  <p className="text-sm">{userDetails.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                  <p className="text-sm">{userDetails.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="text-sm">{userDetails.phone || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF</label>
                  <p className="text-sm">{userDetails.cpf || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Perfil</label>
                  <div className="mt-1">
                    <Badge variant={userDetails.profile === 'admin' ? 'default' : 'secondary'}>
                      {userDetails.profile === 'admin' ? 'Administrador' : 'Usuário'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status da Conta</label>
                  <div className="mt-1">
                    <Badge variant={userDetails.active ? 'default' : 'destructive'}>
                      {userDetails.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                  <p className="text-sm">{formatDate(userDetails.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Saldo Atual</label>
                  <p className="text-sm font-bold text-treexpay-green">
                    {formatCurrency(userDetails.balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Transações */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>
                Todas as transações realizadas pelo usuário
              </CardDescription>
              
              {/* Filtros */}
              <div className="flex flex-wrap gap-2 pt-4">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={statusFilter === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(option.value)}
                    className={statusFilter === option.value ? 'bg-treexpay-dark' : ''}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  {statusFilter === 'all' 
                    ? 'Nenhuma transação encontrada'
                    : `Nenhuma transação ${statusOptions.find(o => o.value === statusFilter)?.label.toLowerCase()} encontrada`
                  }
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Data e Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-xs">
                            {transaction.code}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(transaction.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {transaction.description}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={transaction.status as TransactionStatus} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
