import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCheckouts, Checkout } from '@/hooks/useCheckouts';
import { COLOR_THEMES, type ColorTheme, type CheckoutTemplate } from '@/lib/checkoutThemes';
import { cn } from '@/lib/utils';
import { Check, Sparkles, LayoutTemplate, Palette } from 'lucide-react';

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
  const [template, setTemplate] = useState<CheckoutTemplate>('modern');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('purple');
  const [buttonText, setButtonText] = useState('Comprar agora');
  const [securityMessage, setSecurityMessage] = useState('Compra 100% segura');
  const [enablePix, setEnablePix] = useState(true);
  const [enableCard, setEnableCard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { updateCheckout } = useCheckouts();

  useEffect(() => {
    if (checkout) {
      setTitle(checkout.title || '');
      setDescription(checkout.description || '');
      setAmount(checkout.amount?.toString() || '');
      setImageUrl(checkout.image_url || '');
      setNotificationEmail(checkout.notification_email || '');
      setTemplate((checkout.template as CheckoutTemplate) || 'modern');
      setColorTheme((checkout.color_theme as ColorTheme) || 'purple');
      setButtonText(checkout.button_text || 'Comprar agora');
      setSecurityMessage(checkout.security_message || 'Compra 100% segura');
      setEnablePix(checkout.enable_pix ?? true);
      setEnableCard(checkout.enable_card ?? false);
    }
  }, [checkout]);

  const validateUrl = (url: string) => {
    if (!url) return true;
    try { new URL(url); return true; } catch { return false; }
  };

  const validateGmail = (email: string) => {
    if (!email) return true;
    return email.toLowerCase().endsWith('@gmail.com');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3 || title.length > 120) return;
    if (!description.trim() || description.length < 10) return;
    if (!amount || parseFloat(amount) < 1) return;
    if (imageUrl && !validateUrl(imageUrl)) return;
    if (notificationEmail && !validateGmail(notificationEmail)) return;

    setIsLoading(true);
    
    const success = await updateCheckout(checkout.id, {
      title: title.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      image_url: imageUrl.trim(),
      notification_email: notificationEmail.trim(),
      template,
      color_theme: colorTheme,
      button_text: buttonText,
      security_message: securityMessage,
      enable_pix: enablePix,
      enable_card: enableCard,
    });

    if (success) onClose();
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Editar Produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-foreground/80">TÍTULO DO PRODUTO *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Curso Completo de Marketing Digital" minLength={3} maxLength={120} required />
            <p className="text-xs text-muted-foreground mt-1">{title.length}/120 caracteres (mínimo 3)</p>
          </div>

          <div>
            <Label htmlFor="description" className="text-foreground/80">DESCRIÇÃO *</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva seu produto em detalhes..." className="min-h-[100px]" required />
            <p className="text-xs text-muted-foreground mt-1">{description.length} caracteres (mínimo 10)</p>
          </div>

          <div>
            <Label htmlFor="amount" className="text-foreground/80">PREÇO (R$) *</Label>
            <Input id="amount" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
            <p className="text-xs text-muted-foreground mt-1">Valor mínimo: R$ 1,00</p>
          </div>

          <div>
            <Label htmlFor="imageUrl" className="text-foreground/80">URL DA IMAGEM</Label>
            <Input id="imageUrl" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" />
          </div>

          <div>
            <Label htmlFor="notificationEmail" className="text-foreground/80">GMAIL PARA NOTIFICAÇÕES</Label>
            <Input id="notificationEmail" type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} placeholder="seu@gmail.com" />
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label className="text-foreground/80 flex items-center gap-1.5">
              <LayoutTemplate className="h-3.5 w-3.5" /> MODELO
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTemplate('simple')} className={cn("p-3 rounded-lg border-2 text-left transition-all text-sm", template === 'simple' ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/30")}>
                <span className="font-semibold text-foreground">Simples</span>
              </button>
              <button type="button" onClick={() => setTemplate('modern')} className={cn("p-3 rounded-lg border-2 text-left transition-all text-sm", template === 'modern' ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/30")}>
                <span className="font-semibold text-foreground flex items-center gap-1">Moderno <Sparkles className="h-3 w-3 text-primary" /></span>
              </button>
            </div>
          </div>

          {/* Color Theme */}
          <div className="space-y-2">
            <Label className="text-foreground/80 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> TEMA DE CORES
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((key) => (
                <button key={key} type="button" onClick={() => setColorTheme(key)} className={cn("relative p-2.5 rounded-lg border-2 text-left transition-all text-sm flex items-center gap-2", colorTheme === key ? "border-foreground/30" : "border-border/50 hover:border-foreground/20")}>
                  <div className={cn("w-4 h-4 rounded-full bg-gradient-to-br shrink-0", COLOR_THEMES[key].gradient)} />
                  <span className="text-xs font-semibold text-foreground">{COLOR_THEMES[key].label}</span>
                  {colorTheme === key && <Check className="h-3 w-3 text-foreground ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Payment methods */}
          <div className="space-y-2">
            <Label className="text-foreground/80">MÉTODOS DE PAGAMENTO</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/30">
                <span className="text-sm font-medium text-foreground">Pix</span>
                <Switch checked={enablePix} onCheckedChange={setEnablePix} />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/30">
                <span className="text-sm font-medium text-foreground">Cartão de Crédito</span>
                <Switch checked={enableCard} onCheckedChange={setEnableCard} />
              </div>
            </div>
          </div>

          {/* Customization */}
          <div>
            <Label className="text-foreground/80">TEXTO DO BOTÃO</Label>
            <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Comprar agora" />
          </div>
          <div>
            <Label className="text-foreground/80">MENSAGEM DE SEGURANÇA</Label>
            <Input value={securityMessage} onChange={(e) => setSecurityMessage(e.target.value)} placeholder="Compra 100% segura" />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-foreground/20 text-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
