import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCheckouts } from '@/hooks/useCheckouts';
import { Package, DollarSign, Image, Mail, Info, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
      <DialogContent className="max-w-[580px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-semibold">Criar Novo Produto</DialogTitle>
          </div>
          {isLimitReached ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive font-medium">
                Limite de 5 produtos atingido. Delete um produto para continuar.
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Produtos criados: <span className="font-medium text-foreground">{checkouts.length}/5</span>
            </p>
          )}
        </DialogHeader>

        <Separator />

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Informações do Produto */}
          <Card className="p-5 space-y-4 border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Informações do Produto</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="title" className="text-sm font-semibold">Título</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Nome que aparecerá na página de pagamento</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
                placeholder="Ex: Curso Completo de Marketing Digital"
                minLength={3}
                maxLength={120}
                required
                disabled={isLimitReached}
                className="h-11"
              />
              {focusedField === 'title' && (
                <p className="text-xs text-muted-foreground">
                  {title.length}/120 caracteres · Mínimo 3 caracteres
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setFocusedField('description')}
                onBlur={() => setFocusedField(null)}
                placeholder="Descreva seu produto em detalhes..."
                className="min-h-[90px] resize-none"
                required
                disabled={isLimitReached}
              />
              {focusedField === 'description' && (
                <p className="text-xs text-muted-foreground">
                  {description.length} caracteres · Mínimo 10 caracteres
                </p>
              )}
            </div>
          </Card>

          {/* Preço */}
          <Card className="p-5 space-y-4 border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Preço</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-semibold">Valor (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onFocus={() => setFocusedField('amount')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0,00"
                  required
                  disabled={isLimitReached}
                  className="h-11 pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Valor mínimo: R$ 1,00
              </p>
            </div>
          </Card>

          {/* Mídia */}
          <Card className="p-5 space-y-4 border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Mídia</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="imageUrl" className="text-sm font-semibold">URL da Imagem</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Imagem exibida na página de checkout</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                required
                disabled={isLimitReached}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                URL completa começando com https://
              </p>
            </div>
          </Card>

          {/* Notificações */}
          <Card className="p-5 space-y-4 border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="notificationEmail" className="text-sm font-semibold">Gmail</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Receba alertas de vendas em tempo real</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="notificationEmail"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="seu@gmail.com"
                required
                disabled={isLimitReached}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Apenas endereços Gmail são suportados
              </p>
            </div>
          </Card>

          <Separator />

          {/* Footer com aviso */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/50">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Esta ação notificará seu painel financeiro e criará um checkout público
            </p>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="h-11 px-6"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isLimitReached}
              className="h-11 px-6 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Produto'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};