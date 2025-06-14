
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useLocalTransactions } from "@/hooks/useLocalTransactions";

interface WithdrawalFormProps {
  balance: number;
  onWithdrawalSuccess: () => void;
}

export const WithdrawalForm = ({ balance, onWithdrawalSuccess }: WithdrawalFormProps) => {
  const [amount, setAmount] = useState('');
  const [pixType, setPixType] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { addRequest } = useWithdrawalRequests();
  const { addTransaction } = useLocalTransactions();

  const pixTypes = [
    { value: 'CPF', label: 'CPF' },
    { value: 'CNPJ', label: 'CNPJ' },
    { value: 'E-mail', label: 'E-mail' },
    { value: 'Telefone', label: 'Telefone' },
    { value: 'Chave Aleatória', label: 'Chave Aleatória (EVP)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não autenticado",
      });
      return;
    }

    const amountValue = parseFloat(amount);
    
    if (!amountValue || amountValue <= 0) {
      toast({
        variant: "destructive",
        title: "Valor inválido",
        description: "Digite um valor válido para o saque",
      });
      return;
    }

    if (amountValue > balance) {
      toast({
        variant: "destructive",
        title: "Saldo insuficiente",
        description: "O valor solicitado é maior que seu saldo disponível",
      });
      return;
    }

    if (!pixType || !pixKey.trim()) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Selecione o tipo de chave PIX e digite a chave",
      });
      return;
    }

    setLoading(true);

    try {
      const requestId = `WR${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
      
      // Adicionar solicitação de saque
      addRequest({
        id: requestId,
        user: user.id,
        userName: user.name,
        userEmail: user.email,
        amount: amountValue,
        pixKeyType: pixType,
        pixKey: pixKey.trim(),
        status: 'pending',
        requestedAt: new Date().toISOString()
      });

      // Adicionar transação
      addTransaction({
        id: requestId,
        code: requestId,
        type: 'withdrawal',
        amount: amountValue,
        description: `Saque PIX - ${pixType}: ${pixKey}`,
        status: 'pending',
        created_at: new Date().toISOString(),
        user_id: user.id
      });

      toast({
        title: "Saque solicitado com sucesso",
        description: `Sua solicitação de saque de R$ ${amountValue.toFixed(2)} foi enviada para análise`,
      });
      
      // Limpar formulário
      setAmount('');
      setPixType('');
      setPixKey('');
      
      onWithdrawalSuccess();
    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao processar solicitação",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isAmountExceeded = amount && parseFloat(amount) > balance;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitar Saque PIX</CardTitle>
        <CardDescription>
          Faça uma solicitação de saque via PIX. Saldo disponível: {formatCurrency(balance)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Valor a sacar (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              disabled={loading}
              className={isAmountExceeded ? "border-destructive" : ""}
            />
            {isAmountExceeded && (
              <p className="text-sm text-destructive mt-1">
                Valor excede o saldo disponível
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="pixType">Tipo de chave PIX</Label>
            <Select value={pixType} onValueChange={setPixType} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de chave" />
              </SelectTrigger>
              <SelectContent>
                {pixTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Digite sua chave PIX"
              disabled={loading || !pixType}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-treexpay-medium hover:bg-treexpay-dark"
            disabled={loading || isAmountExceeded || !amount || !pixType || !pixKey}
          >
            {loading ? 'Processando...' : 'Solicitar Saque'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
