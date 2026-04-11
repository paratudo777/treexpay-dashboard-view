
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useCheckouts } from '@/hooks/useCheckouts';
import { 
  Package, DollarSign, Image, Mail, Loader2, CreditCard, 
  QrCode, ShieldCheck, Sparkles, LayoutTemplate, X, Check, Eye, Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateCheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

type CheckoutTemplate = 'simple' | 'modern';

type ColorTheme = 'purple' | 'blue' | 'green' | 'orange';

const COLOR_THEMES: Record<ColorTheme, { label: string; gradient: string; gradientBtn: string; accent: string; accentBg: string; ring: string; preview: string }> = {
  purple: {
    label: 'Roxo Premium',
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
    gradientBtn: 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500',
    accent: 'text-violet-400',
    accentBg: 'bg-violet-500/10 border-violet-500/20',
    ring: 'ring-violet-500/30',
    preview: 'from-violet-600/20 via-purple-600/10 to-transparent',
  },
  blue: {
    label: 'Azul Tech',
    gradient: 'from-blue-600 via-cyan-500 to-teal-400',
    gradientBtn: 'bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10 border-cyan-500/20',
    ring: 'ring-cyan-500/30',
    preview: 'from-blue-600/20 via-cyan-500/10 to-transparent',
  },
  green: {
    label: 'Verde Sucesso',
    gradient: 'from-emerald-600 via-green-500 to-lime-400',
    gradientBtn: 'bg-gradient-to-r from-emerald-600 via-green-500 to-lime-400',
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10 border-emerald-500/20',
    ring: 'ring-emerald-500/30',
    preview: 'from-emerald-600/20 via-green-500/10 to-transparent',
  },
  orange: {
    label: 'Laranja Conversão',
    gradient: 'from-orange-500 via-amber-500 to-yellow-400',
    gradientBtn: 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/10 border-amber-500/20',
    ring: 'ring-amber-500/30',
    preview: 'from-orange-500/20 via-amber-500/10 to-transparent',
  },
};

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
  const [colorTheme, setColorTheme] = useState<ColorTheme>('purple');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { createCheckout, checkouts } = useCheckouts();

  const isLimitReached = checkouts.length >= 5;
  const theme = COLOR_THEMES[colorTheme];

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const validateUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
              <h1 className="text-lg font-bold text-foreground">Criar Checkout</h1>
              <p className="text-xs text-muted-foreground">Produtos: {checkouts.length}/5</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onClose} className="border-foreground/20 text-foreground hover:bg-foreground/10">
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleSubmit()} 
              disabled={isLoading || isLimitReached || !title.trim() || !amount || !notificationEmail.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg"
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
                  <h3 className="text-sm font-semibold text-foreground">MODELO DO CHECKOUT</h3>
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
                    <div className="text-sm font-semibold mb-1 text-foreground">Simples</div>
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
                    <div className="text-sm font-semibold mb-1 flex items-center gap-1 text-foreground">
                      Moderno <Sparkles className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Premium, high-ticket</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Color Theme Selector */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">TEMA DE CORES</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setColorTheme(key)}
                      className={cn(
                        "relative p-3 rounded-xl border-2 transition-all duration-300 text-left group overflow-hidden",
                        colorTheme === key
                          ? "border-foreground/30 shadow-lg"
                          : "border-border/50 hover:border-foreground/20"
                      )}
                    >
                      <div className={cn(
                        "absolute inset-0 opacity-20 bg-gradient-to-br transition-opacity duration-300",
                        COLOR_THEMES[key].gradient,
                        colorTheme === key ? "opacity-30" : "group-hover:opacity-25"
                      )} />
                      <div className="relative flex items-center gap-2.5">
                        <div className={cn(
                          "w-5 h-5 rounded-full bg-gradient-to-br shadow-sm shrink-0",
                          COLOR_THEMES[key].gradient
                        )} />
                        <span className="text-xs font-semibold text-foreground">{COLOR_THEMES[key].label}</span>
                      </div>
                      {colorTheme === key && (
                        <div className="absolute top-1.5 right-1.5">
                          <Check className="h-3 w-3 text-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Product Info */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">INFORMAÇÕES DO PRODUTO</h3>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide text-foreground/80">Título *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Curso Completo de Marketing" maxLength={120} className="bg-background/50" onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)} />
                  {focusedField === 'title' && <p className="text-xs text-muted-foreground">{title.length}/120</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide text-foreground/80">Descrição</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva seu produto..." className="min-h-[80px] resize-none bg-background/50" onFocus={() => setFocusedField('desc')} onBlur={() => setFocusedField(null)} />
                  {focusedField === 'desc' && <p className="text-xs text-muted-foreground">{description.length} caracteres</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide text-foreground/80">Valor (R$) *</Label>
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
                  <h3 className="text-sm font-semibold text-foreground">IMAGEM</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide text-foreground/80">URL da Imagem</Label>
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
                  <h3 className="text-sm font-semibold text-foreground">MÉTODOS DE PAGAMENTO</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <QrCode className="h-5 w-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Pix</p>
                        <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
                      </div>
                    </div>
                    <Switch checked={enablePix} onCheckedChange={setEnablePix} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Cartão de Crédito</p>
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
                  <h3 className="text-sm font-semibold text-foreground">PERSONALIZAÇÃO</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide text-foreground/80">Texto do Botão</Label>
                  <Input value={buttonText} onChange={e => setButtonText(e.target.value)} placeholder="Comprar agora" className="bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide text-foreground/80">Mensagem de Segurança</Label>
                  <Input value={securityMessage} onChange={e => setSecurityMessage(e.target.value)} placeholder="Compra 100% segura" className="bg-background/50" />
                </div>
              </CardContent>
            </Card>

            {/* Notification */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">NOTIFICAÇÕES</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wide text-foreground/80">E-mail de Notificação *</Label>
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
              <h3 className="text-sm font-semibold text-foreground">Preview em Tempo Real</h3>
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
                theme={theme}
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
                theme={theme}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== SHARED TYPES ===================== */
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
  theme: typeof COLOR_THEMES[ColorTheme];
}

/* ===================== SIMPLE TEMPLATE ===================== */
function SimplePreview({ title, description, amount, imageUrl, buttonText, securityMessage, enablePix, enableCard, formatCurrency, theme }: PreviewProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm overflow-hidden shadow-xl transition-all duration-300">
      {/* Image */}
      {imageUrl ? (
        <div className="aspect-video bg-muted overflow-hidden">
          <img src={imageUrl} alt="Product" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
        </div>
      ) : (
        <div className={cn("aspect-video flex items-center justify-center bg-gradient-to-br", theme.preview)}>
          <Package className="h-16 w-16 text-foreground/10" />
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* Title - strong typography */}
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">
          {title || 'Nome do Produto'}
        </h2>
        
        {/* Description - light, spaced */}
        {description && (
          <p className="text-sm text-foreground/70 leading-relaxed font-normal">
            {description}
          </p>
        )}
        
        {/* Price - prominent */}
        <div className={cn("text-3xl font-black tracking-tight", theme.accent)}>
          {formatCurrency(amount)}
        </div>

        {/* Payment Methods */}
        {(enablePix || enableCard) && (
          <div className="space-y-2">
            {enablePix && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <QrCode className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">Pix</span>
              </div>
            )}
            {enableCard && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <CreditCard className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-300">Cartão de Crédito</span>
              </div>
            )}
          </div>
        )}

        <button className={cn(
          "w-full h-12 rounded-xl text-base font-bold text-white shadow-lg transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-[0.98]",
          theme.gradientBtn
        )}>
          {buttonText || 'Comprar agora'}
        </button>

        {securityMessage && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            {securityMessage}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== MODERN TEMPLATE ===================== */
function ModernPreview({ title, description, amount, imageUrl, buttonText, securityMessage, enablePix, enableCard, formatCurrency, theme }: PreviewProps) {
  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden shadow-2xl transition-all duration-300">
      {/* Hero gradient header */}
      <div className={cn("relative p-6 pb-0 bg-gradient-to-br", theme.preview)}>
        <div className="relative">
          <span className={cn(
            "inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 border",
            theme.accentBg, theme.accent
          )}>
            ✨ Oferta Especial
          </span>
          
          {/* Title - strong, modern */}
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight mb-2">
            {title || 'Nome do Produto'}
          </h2>
          
          {/* Description - light, readable */}
          {description && (
            <p className="text-sm text-foreground/65 leading-relaxed font-normal mb-4">
              {description}
            </p>
          )}
        </div>

        {/* Image */}
        {imageUrl ? (
          <div className="relative rounded-t-xl overflow-hidden aspect-[16/9] border border-border/30 border-b-0 mt-2">
            <img src={imageUrl} alt="Product" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        ) : (
          <div className="relative rounded-t-xl overflow-hidden aspect-[16/9] bg-card/50 border border-border/30 border-b-0 mt-2 flex items-center justify-center">
            <Package className="h-20 w-20 text-foreground/5" />
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="bg-card p-6 space-y-5">
        {/* Price highlight */}
        <div className="flex items-baseline gap-2">
          <span className={cn("text-4xl font-black tracking-tight", theme.accent)}>
            {formatCurrency(amount)}
          </span>
          <span className="text-sm text-foreground/50 font-medium">à vista</span>
        </div>

        <Separator className="bg-border/30" />

        {/* Payment Methods */}
        {(enablePix || enableCard) && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">Formas de pagamento</p>
            <div className="flex gap-2">
              {enablePix && (
                <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 transition-all hover:bg-emerald-500/15">
                  <QrCode className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-bold text-emerald-300">Pix</p>
                    <p className="text-[10px] text-foreground/40">Instantâneo</p>
                  </div>
                </div>
              )}
              {enableCard && (
                <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 transition-all hover:bg-blue-500/15">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-blue-300">Cartão</p>
                    <p className="text-[10px] text-foreground/40">Até 12x</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button className={cn(
          "w-full h-14 rounded-xl text-base font-bold text-white shadow-lg transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-[0.98]",
          theme.gradientBtn
        )}>
          {buttonText || 'Comprar agora'}
        </button>

        {securityMessage && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-foreground/50 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            {securityMessage}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-[10px] text-foreground/30 pt-2">
          <span>🔒 SSL</span>
          <span>⚡ Aprovação imediata</span>
          <span>✓ Garantia</span>
        </div>
      </div>
    </div>
  );
}
