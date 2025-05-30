
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/dialog";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  pix_key_type: string;
  pix_key: string;
  status: 'requested' | 'approved' | 'rejected';
  request_date: string;
  profiles: {
    name: string;
    email: string;
  };
}

export default function AdminSaques() {
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar solicitações de saque
  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles (
            name,
            email
          )
        `)
        .order('request_date', { ascending: false });

      if (error) {
        console.error('Error fetching withdrawals:', error);
        throw error;
      }

      return data as WithdrawalRequest[];
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPixKeyType = (type: string) => {
    const types = {
      cpf: 'CPF',
      email: 'E-mail',
      phone: 'Telefone',
      random: 'Chave Aleatória',
      cnpj: 'CNPJ'
    };
    return types[type as keyof typeof types] || type;
  };

  const handleApprove = async (withdrawal: WithdrawalRequest) => {
    setProcessing(withdrawal.id);
    
    try {
      // 1. Debitar o saldo do usuário
      const { error: balanceError } = await supabase.rpc('incrementar_saldo_usuario', {
        p_user_id: withdrawal.user_id,
        p_amount: -withdrawal.amount // Valor negativo para debitar
      });

      if (balanceError) {
        console.error('Erro ao debitar saldo:', balanceError);
        throw balanceError;
      }

      // 2. Atualizar status da solicitação para aprovado
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .update({ status: 'approved' })
        .eq('id', withdrawal.id);

      if (withdrawalError) {
        console.error('Erro ao atualizar saque:', withdrawalError);
        throw withdrawalError;
      }

      // 3. Atualizar transação correspondente para aprovada
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ 
          status: 'approved',
          description: `Saque PIX aprovado - ${formatCurrency(withdrawal.amount)}`
        })
        .eq('user_id', withdrawal.user_id)
        .eq('type', 'withdrawal')
        .eq('amount', withdrawal.amount)
        .eq('status', 'pending');

      if (transactionError) {
        console.error('Erro ao atualizar transação:', transactionError);
        // Não lançar erro aqui para não bloquear o processo
      }

      // Atualizar lista
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      
      toast({
        title: "Saque aprovado",
        description: `Saque de ${formatCurrency(withdrawal.amount)} para ${withdrawal.profiles.name} foi aprovado.`,
      });

    } catch (error) {
      console.error('Erro ao aprovar saque:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao aprovar saque. Tente novamente.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (withdrawal: WithdrawalRequest) => {
    setProcessing(withdrawal.id);
    
    try {
      // 1. Atualizar status da solicitação para rejeitado
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', withdrawal.id);

      if (withdrawalError) {
        console.error('Erro ao rejeitar saque:', withdrawalError);
        throw withdrawalError;
      }

      // 2. Atualizar transação correspondente para cancelada
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({ 
          status: 'cancelled',
          description: `Saque PIX rejeitado - ${formatCurrency(withdrawal.amount)}`
        })
        .eq('user_id', withdrawal.user_id)
        .eq('type', 'withdrawal')
        .eq('amount', withdrawal.amount)
        .eq('status', 'pending');

      if (transactionError) {
        console.error('Erro ao atualizar transação:', transactionError);
        // Não lançar erro aqui para não bloquear o processo
      }

      // Atualizar lista
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      
      toast({
        title: "Saque rejeitado",
        description: `Saque de ${formatCurrency(withdrawal.amount)} para ${withdrawal.profiles.name} foi rejeitado.`,
      });

    } catch (error) {
      console.error('Erro ao rejeitar saque:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao rejeitar saque. Tente novamente.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando solicitações...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Saques</h1>
          <p className="text-muted-foreground">
            Aprove ou rejeite solicitações de saque dos usuários
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Saque</CardTitle>
            <CardDescription>
              Lista de todas as solicitações de saque pendentes e processadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma solicitação de saque encontrada.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
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
                      <TableCell>
                        <div>
                          <div className="font-medium">{withdrawal.profiles.name}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.profiles.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(withdrawal.amount)}
                      </TableCell>
                      <TableCell>{formatPixKeyType(withdrawal.pix_key_type)}</TableCell>
                      <TableCell className="font-mono text-sm">{withdrawal.pix_key}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell>{formatDate(withdrawal.request_date)}</TableCell>
                      <TableCell>
                        {withdrawal.status === 'requested' && (
                          <div className="flex space-x-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={processing === withdrawal.id}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Aprovar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Aprovar Saque</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Você está prestes a aprovar o saque de {formatCurrency(withdrawal.amount)} para {withdrawal.profiles.name}.
                                    <br />
                                    <strong>O valor será debitado do saldo do usuário.</strong>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleApprove(withdrawal)}>
                                    Aprovar Saque
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  disabled={processing === withdrawal.id}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rejeitar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Rejeitar Saque</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Você está prestes a rejeitar o saque de {formatCurrency(withdrawal.amount)} para {withdrawal.profiles.name}.
                                    <br />
                                    O saldo do usuário não será alterado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleReject(withdrawal)}>
                                    Rejeitar Saque
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
