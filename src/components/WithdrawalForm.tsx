
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpFromLine, Key, DollarSign, Bitcoin, QrCode, Sparkles } from "lucide-react";

interface WithdrawalFormProps {
  balance: number;
  onWithdrawalSuccess: () => void;
}

type WithdrawalMethod = 'pix' | 'btc';

const pixTypes = [
  { value: 'cpf', label: 'CPF', icon: '🪪' },
  { value: 'cnpj', label: 'CNPJ', icon: '🏢' },
  { value: 'email', label: 'E-mail', icon: '📧' },
  { value: 'phone', label: 'Telefone', icon: '📱' },
  { value: 'random_key', label: 'Chave Aleatória (EVP)', icon: '🔑' }
];

export const WithdrawalForm = ({ balance, onWithdrawalSuccess }: WithdrawalFormProps) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>('pix');
  const [pixType, setPixType] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [btcWallet, setBtcWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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

    if (method === 'pix' && (!pixType || !pixKey.trim())) {
      toast({ variant: "destructive", title: "Dados incompletos", description: "Selecione o tipo de chave PIX e digite a chave" });
      return;
    }

    if (method === 'btc' && !btcWallet.trim()) {
      toast({ variant: "destructive", title: "Dados incompletos", description: "Digite o endereço da carteira BTC" });
      return;
    }

    setLoading(true);

    try {
      const withdrawalData = method === 'pix' 
        ? {
            user_id: user.id,
            amount: amountValue,
            pix_key_type: pixType,
            pix_key: pixKey.trim(),
            status: 'requested' as const
          }
        : {
            user_id: user.id,
            amount: amountValue,
            pix_key_type: 'btc',
            pix_key: btcWallet.trim(),
            status: 'requested' as const
          };

      const { error } = await supabase
        .from('withdrawals')
        .insert(withdrawalData)
        .select()
        .single();

      if (error) {
        toast({ variant: "destructive", title: "Erro", description: "Erro ao processar solicitação de saque." });
        return;
      }

      toast({
        title: "Saque solicitado com sucesso",
        description: `Sua solicitação de R$ ${amountValue.toFixed(2)} via ${method === 'pix' ? 'PIX' : 'BTC'} foi enviada para análise`,
      });
      
      setAmount('');
      setPixType('');
      setPixKey('');
      setBtcWallet('');
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
  const isFormValid = method === 'pix' 
    ? !!amount && !!pixType && !!pixKey && !isAmountExceeded
    : !!amount && !!btcWallet && !isAmountExceeded;

  return (
    <Card className="glass-card relative overflow-hidden border-border/50">
      {/* Top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl gradient-primary">
              <ArrowUpFromLine className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Solicitar Saque</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Disponível: <span className="font-bold text-primary">{formatCurrency(balance)}</span>
              </p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-primary/40" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Method Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Método de saque
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('pix')}
              className={`relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                method === 'pix'
                  ? 'border-primary bg-primary/10 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]'
                  : 'border-border/50 bg-muted/30 hover:border-border hover:bg-muted/50'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${method === 'pix' ? 'bg-primary/20' : 'bg-muted'}`}>
                <QrCode className={`h-4 w-4 ${method === 'pix' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${method === 'pix' ? 'text-primary' : 'text-foreground'}`}>PIX</p>
                <p className="text-[10px] text-muted-foreground">Instantâneo</p>
              </div>
              {method === 'pix' && (
                <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMethod('btc')}
              className={`relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                method === 'btc'
                  ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]'
                  : 'border-border/50 bg-muted/30 hover:border-border hover:bg-muted/50'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${method === 'btc' ? 'bg-amber-500/20' : 'bg-muted'}`}>
                <Bitcoin className={`h-4 w-4 ${method === 'btc' ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${method === 'btc' ? 'text-amber-500' : 'text-foreground'}`}>Bitcoin</p>
                <p className="text-[10px] text-muted-foreground">Rede BTC</p>
              </div>
              {method === 'btc' && (
                <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              Valor do saque
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R$</span>
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
                className={`h-12 pl-10 bg-muted/30 border-border/50 focus:border-primary/50 text-lg font-semibold ${
                  isAmountExceeded ? "border-destructive focus:border-destructive text-destructive" : ""
                }`}
              />
            </div>
            {isAmountExceeded && (
              <p className="text-xs text-destructive font-medium">⚠ Valor excede o saldo disponível</p>
            )}
          </div>

          {/* PIX Fields */}
          {method === 'pix' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="h-3 w-3" />
                  Tipo de chave PIX
                </Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {pixTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPixType(type.value)}
                      disabled={loading}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                        pixType === type.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/30 bg-muted/20 text-foreground hover:border-border/60 hover:bg-muted/40'
                      }`}
                    >
                      <span className="text-sm">{type.icon}</span>
                      <span className="text-sm font-medium">{type.label}</span>
                      {pixType === type.value && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pixKey" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Chave PIX
                </Label>
                <Input
                  id="pixKey"
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={
                    pixType === 'cpf' ? '000.000.000-00' :
                    pixType === 'cnpj' ? '00.000.000/0000-00' :
                    pixType === 'email' ? 'seuemail@exemplo.com' :
                    pixType === 'phone' ? '(00) 00000-0000' :
                    pixType === 'random_key' ? 'Cole sua chave aleatória' :
                    'Selecione o tipo primeiro'
                  }
                  disabled={loading || !pixType}
                  className="h-11 bg-muted/30 border-border/50 focus:border-primary/50"
                />
              </div>
            </>
          )}

          {/* BTC Fields */}
          {method === 'btc' && (
            <div className="space-y-1.5">
              <Label htmlFor="btcWallet" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Bitcoin className="h-3 w-3" />
                Endereço da carteira BTC
              </Label>
              <Input
                id="btcWallet"
                type="text"
                value={btcWallet}
                onChange={(e) => setBtcWallet(e.target.value)}
                placeholder="bc1q... ou 3... ou 1..."
                disabled={loading}
                className="h-11 bg-muted/30 border-border/50 focus:border-amber-500/50 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Suporta endereços BTC das redes Legacy, SegWit e Native SegWit
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className={`w-full h-12 font-bold text-sm tracking-wide transition-all duration-200 ${
              method === 'btc' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20'
                : 'gradient-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20'
            }`}
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {method === 'btc' ? <Bitcoin className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                Solicitar Saque {method === 'btc' ? 'BTC' : 'PIX'}
              </span>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground/60">
            Solicitações são analisadas pela equipe antes da aprovação
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
