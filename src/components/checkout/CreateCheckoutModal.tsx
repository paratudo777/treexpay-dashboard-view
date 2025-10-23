import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCheckouts } from '@/hooks/useCheckouts';

interface CreateCheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateCheckoutModal = ({ open, onClose }: CreateCheckoutModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createCheckout, checkouts } = useCheckouts();

  const isLimitReached = checkouts.length >= 5;

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateGmail = (email: string) => {
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

    if (!notificationEmail || !validateGmail(notificationEmail)) {
      return;
    }

    setIsLoading(true);
    
    const success = await createCheckout({
      title: title.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      image_url: imageUrl.trim(),
      notification_email: notificationEmail.trim()
    });

    if (success) {
      setTitle('');
      setDescription('');
      setAmount('');
      setImageUrl('');
      setNotificationEmail('');
      onClose();
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Produto</DialogTitle>
          <DialogDescription>
            {isLimitReached ? (
              <span className="text-destructive font-medium">
                Limite de 5 produtos atingido. Delete um produto para criar outro.
              </span>
            ) : (
              `Produtos criados: ${checkouts.length}/5`
            )}
          </DialogDescription>
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
              disabled={isLimitReached}
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
              disabled={isLimitReached}
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
              disabled={isLimitReached}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Valor mínimo: R$ 1,00
            </p>
          </div>

          <div>
            <Label htmlFor="imageUrl">URL da Imagem *</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              required
              disabled={isLimitReached}
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL completa da imagem do produto (começando com http:// ou https://)
            </p>
          </div>

          <div>
            <Label htmlFor="notificationEmail">Gmail para Notificações *</Label>
            <Input
              id="notificationEmail"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="seu@gmail.com"
              required
              disabled={isLimitReached}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Você receberá notificações de vendas neste email (somente Gmail)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || isLimitReached}>
              {isLoading ? 'Criando...' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};