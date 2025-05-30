
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserBalance } from "@/hooks/useUserBalance";
import { useWithdrawals } from "@/hooks/useWithdrawals";
import { Badge } from "@/components/ui/badge";

export default function Financeiro() {
  const [amount, setAmount] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { balance, loading: balanceLoading } = useUserBalance();
  const { withdrawals, loading: withdrawalsLoading, createWithdrawalRequest } = useWithdrawals();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount);
    
    if (!amount || amountValue <= 0) {
      toast({
        variant: "destructive",
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para saque.",
      });
      return;
    }

    if (amountValue > balance) {
      toast({
        variant: "destructive",
        title: "Saldo insuficiente",
        description: "Você não possui saldo suficiente para este saque.",
      });
      return;
    }

    if (!pixKeyType) {
      toast({
        variant: "destructive",
        title: "Tipo de chave não selecionado",
        description: "Por favor, selecione um tipo de chave PIX.",
      });
      return;
    }

    if (!pixKey) {
      toast({
        variant: "destructive",
        title: "Chave PIX não informada",
        description: "Por favor, insira sua chave PIX.",
      });
      return;
    }

    setIsSubmitting(true);
    
    const success = await createWithdrawalRequest(amountValue, pixKey, pixKeyType);
    
    if (success) {
      setAmount("");
      setPixKey("");
      setPixKeyType("");
    }
    
    setIsSubmitting(false);
  };

  const getPlaceholderByKeyType = () => {
    switch (pixKeyType) {
      case "cpf":
        return "000.000.000-00";
      case "email":
        return "seu.email@gmail.com";
      case "phone":
        return "+55 (00) 00000-0000";
      case "random":
        return "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
      case "cnpj":
        return "00.000.000/0001-00";
      default:
        return "Selecione um tipo de chave primeiro";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'processed':
        return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Financeiro</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle>Saldo Disponível</CardTitle>
                <CardDescription>Valor disponível para saque</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-treexpay-medium">
                  {balanceLoading ? 'Carregando...' : formatCurrency(balance)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Solicitar Saque PIX</CardTitle>
                <CardDescription>
                  Informe os dados para transferência via PIX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor a sacar (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={balance}
                      placeholder="0,00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pixKeyType">Tipo de chave PIX</Label>
                    <Select
                      value={pixKeyType}
                      onValueChange={setPixKeyType}
                    >
                      <SelectTrigger id="pixKeyType">
                        <SelectValue placeholder="Selecione o tipo de chave" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="random">Chave aleatória</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pixKey">Chave PIX</Label>
                    <Input
                      id="pixKey"
                      type="text"
                      placeholder={getPlaceholderByKeyType()}
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      disabled={!pixKeyType}
                    />
                  </div>
                  
                  <Alert className="bg-yellow-900/20 border-yellow-900/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Sua solicitação será analisada pela equipe. O valor será debitado apenas após aprovação.
                    </AlertDescription>
                  </Alert>
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Solicitar Saque"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Saques</CardTitle>
                <CardDescription>
                  Suas solicitações de saque
                </CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <p>Carregando...</p>
                ) : withdrawals.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma solicitação encontrada.</p>
                ) : (
                  <div className="space-y-4">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(withdrawal.status)}
                          <div>
                            <p className="font-medium">{formatCurrency(withdrawal.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(withdrawal.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {withdrawal.pix_key_type.toUpperCase()}: {withdrawal.pix_key}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
