
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWithdrawals } from "@/hooks/useWithdrawals";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
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

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Solicitações de Saque</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Saques Pendentes</CardTitle>
            <CardDescription>
              Gerencie as solicitações de saque dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Carregando...</p>
            ) : withdrawals.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma solicitação pendente encontrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Chave PIX</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.user?.name}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(withdrawal.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {withdrawal.pix_key}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {withdrawal.pix_key_type.toUpperCase()}
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
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="default"
                                disabled={processing === withdrawal.id}
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
                                  O valor será debitado do saldo do usuário e uma transação será criada.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleApproveWithdrawal(withdrawal.id)}>
                                  Aprovar
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
                                Rejeitar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rejeitar Saque</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja rejeitar este saque de {formatCurrency(withdrawal.amount)} para {withdrawal.user?.name}?
                                  <br /><br />
                                  O saldo do usuário não será alterado.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRejectWithdrawal(withdrawal.id)}>
                                  Rejeitar
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
