
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCheckouts } from '@/hooks/useCheckouts';
import { 
  Package, DollarSign, Image, Mail, Info, Loader2, CreditCard, 
  QrCode, ShieldCheck, Sparkles, LayoutTemplate, X, Check, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateCheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

type CheckoutTemplate = 'simple' | 'modern';

export const CreateCheckoutModal = ({ open, onClose }: CreateCheckoutModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [buttonText, setButtonText] = useState('Comprar agora');
  const [securityMessage, setSecurityMessage] = useState('Compra 100% segura');
  const [enablePix, setEnablePix] = useState(true);
  const [enableCard, setEnableCard] = useState(false);
  const [template, setTemplate] = useState<CheckoutTemplate>('modern');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { createCheckout, checkouts } = useCheckouts();

  const isLimitReached = checkouts.length >= 5;

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const validateUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) return;
    if (!amount || parseFloat(amount) < 1) return;
    if (imageUrl && !validateUrl(imageUrl)) return;
    if (!notificationEmail) return;

    setIsLoading(true);
    const success = await createCheckout({
      title: title.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      image_url: imageUrl.trim(),
      notification_email: notificationEmail.trim()
    });
    if (success) onClose();
    setIsLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border/50 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Criar Checkout</h1>
              <p className="text-xs text-muted-foreground">Produtos: {checkouts.length}/5</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit} 
              disabled={isLoading || isLimitReached || !title.trim() || !amount}
              className="gradient-primary hover:brightness-110"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Criando...</> : <><Check className="h-4 w-4 mr-1" />Criar Produto</>}
            </Button>
          </div>
        </div>

        {/* Main Content - 2 Columns */}
        <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT - Form */}
          <div className="space-y-6 animate-fade-in">
            {/* Template Selector */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Modelo do Checkout</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTemplate('simple')}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      template === 'simple' 
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" 
                        : "border-border/50 hover:border-primary/30 hover:bg-card"
                    )}
                  >
                    <div className="text-sm font-semibold mb-1">Simples</div>
                    <p className="text-xs text-muted-foreground">Clean e minimalista</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('modern')}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      template === 'modern' 
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" 
                        : "border-border/50 hover:border-primary/30 hover:bg-card"
                    )}
                  >
                    <div className="text-sm font-semibold mb-1 flex items-center gap-1">
                      Moderno <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Premium, high-ticket</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Product Info */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Informações do Produto</h3>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide">Título *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Curso Completo de Marketing" maxLength={120} className="bg-background/50" onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)} />
                  {focusedField === 'title' && <p className="text-xs text-muted-foreground">{title.length}/120</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide">Descrição</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva seu produto..." className="min-h-[80px] resize-none bg-background/50" onFocus={() => setFocusedField('desc')} onBlur={() => setFocusedField(null)} />
                  {focusedField === 'desc' && <p className="text-xs text-muted-foreground">{description.length} caracteres</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide">Valor (R$) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">R$</span>
                    <Input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="pl-10 bg-background/50" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Imagem</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide">URL da Imagem</Label>
                  <Input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="bg-background/50" />
                </div>
                {imageUrl && validateUrl(imageUrl) && (
                  <div className="rounded-lg overflow-hidden border border-border/30 aspect-video bg-muted">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Métodos de Pagamento</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <QrCode className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium">Pix</p>
                        <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                      </div>
                    </div>
                    <Switch checked={enablePix} onCheckedChange={setEnablePix} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium">Cartão de Crédito</p>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard, etc.</p>
                      </div>
                    </div>
                    <Switch checked={enableCard} onCheckedChange={setEnableCard} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customization */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Personalização</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide">Texto do Botão</Label>
                  <Input value={buttonText} onChange={e => setButtonText(e.target.value)} placeholder="Comprar agora" className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide">Mensagem de Segurança</Label>
                  <Input value={securityMessage} onChange={e => setSecurityMessage(e.target.value)} placeholder="Compra 100% segura" className="bg-background/50" />
                </div>
              </CardContent>
            </Card>

            {/* Notification */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Notificações</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide">E-mail de Notificação *</Label>
                  <Input type="email" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)} placeholder="seu@gmail.com" className="bg-background/50" />
                  <p className="text-xs text-muted-foreground">Receba alertas de vendas em tempo real</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT - Live Preview */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Preview em Tempo Real</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {template === 'simple' ? 'Simples' : 'Moderno'}
              </span>
            </div>

            {template === 'simple' ? (
              <SimplePreview
                title={title}
                description={description}
                amount={amount}
                imageUrl={imageUrl}
                buttonText={buttonText}
                securityMessage={securityMessage}
                enablePix={enablePix}
                enableCard={enableCard}
                formatCurrency={formatCurrency}
              />
            ) : (
              <ModernPreview
                title={title}
                description={description}
                amount={amount}
                imageUrl={imageUrl}
                buttonText={buttonText}
                securityMessage={securityMessage}
                enablePix={enablePix}
                enableCard={enableCard}
                formatCurrency={formatCurrency}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== SIMPLE TEMPLATE ===================== */
interface PreviewProps {
  title: string;
  description: string;
  amount: string;
  imageUrl: string;
  buttonText: string;
  securityMessage: string;
  enablePix: boolean;
  enableCard: boolean;
  formatCurrency: (v: string) => string;
}

function SimplePreview({ title, description, amount, imageUrl, buttonText, securityMessage, enablePix, enableCard, formatCurrency }: PreviewProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm overflow-hidden shadow-xl transition-all duration-300">
      {/* Image */}
      {imageUrl ? (
        <div className="aspect-video bg-muted overflow-hidden">
          <img src={imageUrl} alt="Product" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
          <Package className="h-16 w-16 text-muted-foreground/20" />
        </div>
      )}

      <div className="p-6 space-y-4">
        <h2 className="text-xl font-bold">{title || 'Nome do Produto'}</h2>
        {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
        
        <div className="text-3xl font-bold text-primary">{formatCurrency(amount)}</div>

        {/* Payment Methods */}
        {(enablePix || enableCard) && (
          <div className="space-y-2">
            {enablePix && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <QrCode className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Pix</span>
              </div>
            )}
            {enableCard && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Cartão de Crédito</span>
              </div>
            )}
          </div>
        )}

        <Button className="w-full h-12 text-base font-bold gradient-primary hover:brightness-110 transition-all">
          {buttonText || 'Comprar agora'}
        </Button>

        {securityMessage && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            {securityMessage}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== MODERN TEMPLATE ===================== */
function ModernPreview({ title, description, amount, imageUrl, buttonText, securityMessage, enablePix, enableCard, formatCurrency }: PreviewProps) {
  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden shadow-2xl shadow-primary/5 transition-all duration-300">
      {/* Hero gradient header */}
      <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 pb-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative">
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary/20 text-primary mb-4">
            Oferta Especial
          </span>
          <h2 className="text-2xl font-bold mb-2">{title || 'Nome do Produto'}</h2>
          {description && <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>}
        </div>

        {/* Image */}
        {imageUrl ? (
          <div className="relative rounded-t-xl overflow-hidden aspect-[16/9] border border-border/30 border-b-0 mt-2">
            <img src={imageUrl} alt="Product" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        ) : (
          <div className="relative rounded-t-xl overflow-hidden aspect-[16/9] bg-card/50 border border-border/30 border-b-0 mt-2 flex items-center justify-center">
            <Package className="h-20 w-20 text-muted-foreground/10" />
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="bg-card p-6 space-y-5">
        {/* Price highlight */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-primary tracking-tight">{formatCurrency(amount)}</span>
          <span className="text-sm text-muted-foreground">à vista</span>
        </div>

        <Separator className="bg-border/30" />

        {/* Payment Methods */}
        {(enablePix || enableCard) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formas de pagamento</p>
            <div className="flex gap-2">
              {enablePix && (
                <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 transition-all hover:bg-emerald-500/15">
                  <QrCode className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">Pix</p>
                    <p className="text-[10px] text-muted-foreground">Instantâneo</p>
                  </div>
                </div>
              )}
              {enableCard && (
                <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 transition-all hover:bg-blue-500/15">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-blue-400">Cartão</p>
                    <p className="text-[10px] text-muted-foreground">Até 12x</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Button className="w-full h-14 text-base font-bold gradient-primary hover:brightness-110 transition-all rounded-xl shadow-lg shadow-primary/20">
          {buttonText || 'Comprar agora'}
        </Button>

        {securityMessage && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            {securityMessage}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/60 pt-2">
          <span>🔒 SSL</span>
          <span>⚡ Aprovação imediata</span>
          <span>✓ Garantia</span>
        </div>
      </div>
    </div>
  );
}
