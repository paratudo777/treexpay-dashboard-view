
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserBalance } from "@/hooks/useUserBalance";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Financeiro() {
  const [amount, setAmount] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { balance, loading } = useUserBalance();
  const { user } = useAuth();

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
        description: "O valor solicitado é maior que seu saldo disponível.",
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

    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Usuário não identificado.",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Gerar código único para a transação
      const code = 'SAQ' + Date.now().toString();
      
      // Criar solicitação de saque (transação pendente)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          code: code,
          type: 'withdrawal',
          amount: amountValue,
          status: 'pending',
          description: `Saque PIX solicitado - ${formatCurrency(amountValue)}`
        });

      if (transactionError) {
        console.error('Erro ao criar transação:', transactionError);
        throw transactionError;
      }

      // Criar registro de saque para aprovação do admin
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: amountValue,
          pix_key_type: pixKeyType as 'cpf' | 'email' | 'phone' | 'random' | 'cnpj',
          pix_key: pixKey,
          status: 'requested'
        });

      if (withdrawalError) {
        console.error('Erro ao criar solicitação de saque:', withdrawalError);
        throw withdrawalError;
      }

      setIsSuccess(true);
      
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de saque foi enviada para aprovação.",
      });

      setTimeout(() => {
        setIsSuccess(false);
        setAmount("");
        setPixKey("");
        setPixKeyType("");
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao processar saque:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao processar solicitação de saque. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Financeiro</h1>
        
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Saldo Disponível</CardTitle>
            <CardDescription>Valor disponível para saque</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-treexpay-medium">
              {loading ? 'Carregando...' : formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solicitar Saque PIX</CardTitle>
            <CardDescription>
              Informe os dados para transferência via PIX. Sua solicitação será analisada e processada em até 24h.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <Alert className="bg-green-900/20 border-green-900/50">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Solicitação enviada!</AlertTitle>
                <AlertDescription>
                  Sua solicitação de saque foi enviada para aprovação. Você será notificado quando for processada.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor a sacar (R$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balance}
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Saldo disponível: {formatCurrency(balance)}
                  </p>
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
                
                <Alert variant="destructive" className="bg-orange-900/20 border-orange-900/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Confira os dados informados. A solicitação será enviada para aprovação e processada em até 24h.
                  </AlertDescription>
                </Alert>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Solicitar Saque"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
