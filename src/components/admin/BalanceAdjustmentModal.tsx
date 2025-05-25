
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
}

interface BalanceAdjustmentModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BalanceAdjustmentModal = ({ user, isOpen, onClose, onSuccess }: BalanceAdjustmentModalProps) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const handleSubmit = async () => {
    if (!user || !currentUser) return;

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, insira um valor válido (diferente de zero).",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('adjust_user_balance', {
        p_user_id: user.id,
        p_admin_id: currentUser.id,
        p_amount: amountValue,
        p_reason: reason || null
      });

      if (error) {
        console.error('Error adjusting balance:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao ajustar saldo do usuário.",
        });
        return;
      }

      toast({
        title: "Saldo ajustado",
        description: `Saldo de ${user.name} foi ${amountValue > 0 ? 'incrementado' : 'decrementado'} em R$ ${Math.abs(amountValue).toFixed(2)}.`,
      });

      onSuccess();
      onClose();
      setAmount('');
      setReason('');
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setAmount('');
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Saldo do Usuário</DialogTitle>
          <DialogDescription>
            Ajustar saldo de <strong>{user?.name}</strong> (Saldo atual: R$ {user?.balance.toFixed(2)})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Valor
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Ex: 100.00 ou -50.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Motivo
            </Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo do ajuste (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>• Use valores positivos para <strong>adicionar</strong> saldo</p>
            <p>• Use valores negativos para <strong>remover</strong> saldo</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !amount}
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Ajustando...
              </>
            ) : (
              "Ajustar Saldo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
