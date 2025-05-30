
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWithdrawals } from "@/hooks/useWithdrawals";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AdminWithdrawals() {
  const { withdrawals, loading, fetchPendingWithdrawals } = useWithdrawals();
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingWithdrawals();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPixKeyType = (type: string) => {
    const types: { [key: string]: string } = {
      'cpf': 'CPF',
      'cnpj': 'CNPJ',
      'email': 'E-mail',
      'phone': 'Celular',
      'random': 'Aleatória'
    };
    return types[type] || type.toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'processed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Recusado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    setProcessing(withdrawalId);
    
    try {
      const { error } = await supabase.functions.invoke('approve-withdrawal', {
        body: { withdrawalId }
      });

      if (error) {
        console.error('Error approving withdrawal:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao aprovar saque. Tente novamente.",
        });
        return;
      }

      toast({
        title: "Saque aprovado",
        description: "O saque foi aprovado e processado com sucesso.",
      });

      fetchPendingWithdrawals();
    } catch (error) {
      console.error('Error in handleApproveWithdrawal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    setProcessing(withdrawalId);
    
    try {
      const { error } = await supabase.functions.invoke('reject-withdrawal', {
        body: { withdrawalId }
      });

      if (error) {
        console.error('Error rejecting withdrawal:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao rejeitar saque. Tente novamente.",
        });
        return;
      }

      toast({
        title: "Saque rejeitado",
        description: "O saque foi rejeitado com sucesso.",
      });

      fetchPendingWithdrawals();
    } catch (error) {
      console.error('Error in handleRejectWithdrawal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setProcessing(null);
    }
  };

  // Filtrar apenas solicitações que ainda estão pendentes para a página principal
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'requested');

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-7xl p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-treexpay-medium">Solicitações de Saque</h1>
          <p className="text-muted-foreground">Gerencie as solicitações de saque dos usuários</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Saques Pendentes
            </CardTitle>
            <CardDescription>
              Solicitações aguardando aprovação ou rejeição
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
                <span className="ml-2">Carregando solicitações...</span>
              </div>
            ) : pendingWithdrawals.length === 0 ? (
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">Nenhuma solicitação pendente encontrada.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Quando os usuários solicitarem saques, eles aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Chave PIX</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{withdrawal.user?.name || 'Nome não disponível'}</p>
                            <p className="text-sm text-muted-foreground">{withdrawal.user?.email || 'Email não disponível'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-lg">
                          {formatCurrency(withdrawal.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {withdrawal.pix_key}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatPixKeyType(withdrawal.pix_key_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(withdrawal.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(withdrawal.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  disabled={processing === withdrawal.id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Aprovar Saque</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja aprovar este saque de {formatCurrency(withdrawal.amount)} para {withdrawal.user?.name}?
                                    <br /><br />
                                    <strong>O valor será debitado do saldo do usuário e uma transação será criada.</strong>
                                    <br /><br />
                                    <div className="bg-muted p-3 rounded mt-2">
                                      <p><strong>Chave PIX:</strong> {withdrawal.pix_key}</p>
                                      <p><strong>Tipo:</strong> {formatPixKeyType(withdrawal.pix_key_type)}</p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleApproveWithdrawal(withdrawal.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
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
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Recusar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Recusar Saque</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja recusar este saque de {formatCurrency(withdrawal.amount)} para {withdrawal.user?.name}?
                                    <br /><br />
                                    <strong>O saldo do usuário não será alterado.</strong>
                                    <br /><br />
                                    <div className="bg-muted p-3 rounded mt-2">
                                      <p><strong>Chave PIX:</strong> {withdrawal.pix_key}</p>
                                      <p><strong>Tipo:</strong> {formatPixKeyType(withdrawal.pix_key_type)}</p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRejectWithdrawal(withdrawal.id)}>
                                    Recusar Saque
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
    </DashboardLayout>
  );
}
