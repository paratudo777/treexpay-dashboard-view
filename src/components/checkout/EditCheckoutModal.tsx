import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCheckouts, Checkout } from '@/hooks/useCheckouts';

interface EditCheckoutModalProps {
  checkout: Checkout;
  open: boolean;
  onClose: () => void;
}

export const EditCheckoutModal = ({ checkout, open, onClose }: EditCheckoutModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { updateCheckout } = useCheckouts();

  useEffect(() => {
    if (checkout) {
      setTitle(checkout.title || '');
      setDescription(checkout.description || '');
      setAmount(checkout.amount?.toString() || '');
      setImageUrl(checkout.image_url || '');
      setNotificationEmail(checkout.notification_email || '');
    }
  }, [checkout]);

  const validateUrl = (url: string) => {
    if (!url) return true; // Opcional
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateGmail = (email: string) => {
    if (!email) return true; // Opcional
    return email.toLowerCase().endsWith('@gmail.com');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || title.length < 3 || title.length > 120) {
      return;
    }

    if (!description.trim() || description.length < 10) {
      return;
    }

    if (!amount || parseFloat(amount) < 1) {
      return;
    }

    if (imageUrl && !validateUrl(imageUrl)) {
      return;
    }

    if (notificationEmail && !validateGmail(notificationEmail)) {
      return;
    }

    setIsLoading(true);
    
    const success = await updateCheckout(checkout.id, {
      title: title.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      image_url: imageUrl.trim(),
      notification_email: notificationEmail.trim()
    });

    if (success) {
      onClose();
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título do Produto *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Curso Completo de Marketing Digital"
              minLength={3}
              maxLength={120}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/120 caracteres (mínimo 3)
            </p>
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva seu produto em detalhes..."
              className="min-h-[100px]"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length} caracteres (mínimo 10)
            </p>
          </div>

          <div>
            <Label htmlFor="amount">Preço (R$) *</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Valor mínimo: R$ 1,00
            </p>
          </div>

          <div>
            <Label htmlFor="imageUrl">URL da Imagem</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL completa da imagem do produto
            </p>
          </div>

          <div>
            <Label htmlFor="notificationEmail">Gmail para Notificações</Label>
            <Input
              id="notificationEmail"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="seu@gmail.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email para receber notificações de vendas (somente Gmail)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};