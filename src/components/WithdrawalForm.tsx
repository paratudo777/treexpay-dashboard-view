
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";

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
  const { refreshTransactions } = useTransactions();

  const pixTypes = [
    { value: 'CPF', label: 'CPF' },
    { value: 'E-mail', label: 'E-mail' },
    { value: 'Chave Aleatória', label: 'Chave Aleatória' },
    { value: 'Telefone', label: 'Telefone' },
    { value: 'CNPJ', label: 'CNPJ' }
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
      const { data, error } = await supabase.functions.invoke('api-withdraw', {
        body: {
          userId: user.id,
          amount: amountValue,
          pixType,
          pixKey: pixKey.trim()
        }
      });

      if (error) {
        console.error('Erro na requisição:', error);
        throw new Error(error.message || 'Erro interno do servidor');
      }

      if (data?.success) {
        toast({
          title: "Saque solicitado com sucesso",
          description: `Sua solicitação de saque de R$ ${amountValue.toFixed(2)} foi enviada para análise`,
        });
        
        // Limpar formulário
        setAmount('');
        setPixType('');
        setPixKey('');
        
        // Atualizar transações
        refreshTransactions();
        onWithdrawalSuccess();
      } else {
        throw new Error(data?.error || 'Erro ao processar solicitação');
      }
    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar solicitação",
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
              min="0"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              disabled={loading}
            />
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
            disabled={loading}
          >
            {loading ? 'Carregando...' : 'Solicitar Saque'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
