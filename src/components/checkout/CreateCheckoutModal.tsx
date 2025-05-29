
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCheckouts } from '@/hooks/useCheckouts';

interface CreateCheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateCheckoutModal = ({ open, onClose }: CreateCheckoutModalProps) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createCheckout } = useCheckouts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      return;
    }

    setIsLoading(true);
    
    const success = await createCheckout({
      title: title.trim(),
      amount: parseFloat(amount)
    });

    if (success) {
      setTitle('');
      setAmount('');
      onClose();
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Checkout</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Nome do Produto</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Produto Premium"
              required
            />
          </div>
          <div>
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Checkout'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
