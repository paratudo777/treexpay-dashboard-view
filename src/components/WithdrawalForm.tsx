
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpFromLine, Key, DollarSign } from "lucide-react";

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

  const pixTypes = [
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone' },
    { value: 'random_key', label: 'Chave Aleatória (EVP)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado" });
      return;
    }

    const amountValue = parseFloat(amount);
    
    if (!amountValue || amountValue <= 0) {
      toast({ variant: "destructive", title: "Valor inválido", description: "Digite um valor válido para o saque" });
      return;
    }

    if (amountValue > balance) {
      toast({ variant: "destructive", title: "Saldo insuficiente", description: "O valor solicitado é maior que seu saldo disponível" });
      return;
    }

    if (!pixType || !pixKey.trim()) {
      toast({ variant: "destructive", title: "Dados incompletos", description: "Selecione o tipo de chave PIX e digite a chave" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: amountValue,
          pix_key_type: pixType,
          pix_key: pixKey.trim(),
          status: 'requested'
        })
        .select()
        .single();

      if (error) {
        toast({ variant: "destructive", title: "Erro", description: "Erro ao processar solicitação de saque." });
        return;
      }

      toast({
        title: "Saque solicitado com sucesso",
        description: `Sua solicitação de R$ ${amountValue.toFixed(2)} foi enviada para análise`,
      });
      
      setAmount('');
      setPixType('');
      setPixKey('');
      onWithdrawalSuccess();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Erro interno. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const isAmountExceeded = amount && parseFloat(amount) > balance;

  return (
    <Card className="glass-card relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Solicitar Saque PIX</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Disponível: <span className="font-semibold text-primary">{formatCurrency(balance)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Valor do saque
            </Label>
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
              className={`h-11 bg-muted/50 border-border/50 focus:border-primary/50 ${isAmountExceeded ? "border-destructive focus:border-destructive" : ""}`}
            />
            {isAmountExceeded && (
              <p className="text-xs text-destructive">Valor excede o saldo disponível</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixType" className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-muted-foreground" />
              Tipo de chave PIX
            </Label>
            <Select value={pixType} onValueChange={setPixType} disabled={loading}>
              <SelectTrigger className="h-11 bg-muted/50 border-border/50">
                <SelectValue placeholder="Selecione o tipo" />
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

          <div className="space-y-2">
            <Label htmlFor="pixKey" className="text-sm font-medium text-foreground">
              Chave PIX
            </Label>
            <Input
              id="pixKey"
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Digite sua chave PIX"
              disabled={loading || !pixType}
              className="h-11 bg-muted/50 border-border/50 focus:border-primary/50"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 gradient-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
            disabled={loading || !!isAmountExceeded || !amount || !pixType || !pixKey}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4" />
                Solicitar Saque
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
