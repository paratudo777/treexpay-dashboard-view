
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

export default function Financeiro() {
  const [amount, setAmount] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { balance, loading } = useUserBalance();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para saque.",
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
    
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      
      toast({
        title: "Solicitação de saque enviada",
        description: "Você receberá o valor em até D+0.",
      });

      setTimeout(() => {
        setIsSuccess(false);
        setAmount("");
        setPixKey("");
        setPixKeyType("");
      }, 3000);
    }, 1500);
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
              Informe os dados para transferência via PIX
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <Alert className="bg-green-900/20 border-green-900/50">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Solicitação enviada!</AlertTitle>
                <AlertDescription>
                  Você receberá o valor em até D+0. O valor será enviado para a chave PIX informada.
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
                      <SelectItem value="email">E-mail (Gmail)</SelectItem>
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
                
                <Alert variant="destructive" className="bg-red-900/20 border-red-900/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Confira os dados informados. O valor será enviado para a chave PIX cadastrada.
                  </AlertDescription>
                </Alert>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Processando..." : "Solicitar Saque"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
