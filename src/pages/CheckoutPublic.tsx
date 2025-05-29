
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Loader, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { qrImage, fmtDate } from '@/utils/pixHelpers';

interface CheckoutData {
  id: string;
  title: string;
  amount: number;
  url_slug: string;
  active: boolean;
}

interface PixData {
  qrcode: string;
  qrcodeText: string;
  expiresAt: string;
}

interface PaymentStatus {
  paid: boolean;
  paidAt?: string;
}

export default function CheckoutPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [nameError, setNameError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ paid: false });
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [externalRef, setExternalRef] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchCheckout();
    }
  }, [slug]);

  // Verificar status do pagamento a cada 5 segundos quando PIX estiver ativo
  useEffect(() => {
    if (!pixData || paymentStatus.paid) return;

    const checkPaymentStatus = async () => {
      if (checkingPayment) return;
      
      setCheckingPayment(true);
      try {
        const { data } = await supabase
          .from('checkout_payments')
          .select('status, paid_at')
          .eq('status', 'paid')
          .like('pix_data', `%${externalRef}%`)
          .maybeSingle();

        if (data) {
          setPaymentStatus({
            paid: true,
            paidAt: data.paid_at
          });
          
          toast({
            title: "Pagamento confirmado! ✅",
            description: "Seu pagamento foi processado com sucesso.",
          });
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
      } finally {
        setCheckingPayment(false);
      }
    };

    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [pixData, paymentStatus.paid, externalRef, checkingPayment]);

  const validateName = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      setNameError('O nome deve ter pelo menos 3 caracteres');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerName(value);
    if (value) {
      validateName(value);
    }
  };

  const fetchCheckout = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('checkouts')
        .select('*')
        .eq('url_slug', slug)
        .eq('active', true)
        .single();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Checkout não encontrado",
          description: "Este link de pagamento não existe ou está inativo.",
        });
        return;
      }

      setCheckout(data);
    } catch (error) {
      console.error('Error fetching checkout:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar checkout.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!checkout) return;

    const trimmedName = customerName.trim();
    
    if (!trimmedName || trimmedName.length < 3) {
      setNameError('O nome deve ter pelo menos 3 caracteres');
      toast({
        variant: "destructive",
        title: "Nome inválido",
        description: "Por favor, digite um nome com pelo menos 3 caracteres.",
      });
      return;
    }

    setProcessingPayment(true);
    setNameError('');

    try {
      console.log('Enviando dados:', {
        checkoutSlug: checkout.url_slug,
        customerName: trimmedName,
        customerEmail: customerEmail.trim() || undefined
      });

      const { data, error } = await supabase.functions.invoke('checkout-pix-payment', {
        body: {
          checkoutSlug: checkout.url_slug,
          customerName: trimmedName,
          customerEmail: customerEmail.trim() || undefined
        }
      });

      console.log('Resposta recebida:', data);

      if (error) {
        console.error('Erro da função:', error);
        throw error;
      }

      if (data.success) {
        setPixData(data.pix);
        setExternalRef(data.externalRef);
        toast({
          title: "PIX gerado com sucesso!",
          description: "Utilize o QR Code para realizar o pagamento.",
        });
      } else {
        throw new Error(data.error || "Erro ao gerar PIX");
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PIX",
        description: "Ocorreu um erro ao gerar o código PIX. Tente novamente.",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.qrcode) {
      try {
        await navigator.clipboard.writeText(pixData.qrcode);
        toast({
          title: "Código copiado!",
          description: "O código PIX foi copiado para a área de transferência.",
        });
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o código. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Checkout não encontrado
            </h1>
            <p className="text-muted-foreground">
              Este link de pagamento não existe ou está inativo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isNameValid = customerName.trim().length >= 3;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{checkout.title}</CardTitle>
          <CardDescription className="text-xl font-semibold text-treexpay-medium">
            {formatCurrency(checkout.amount)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pixData ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="customerName">Seu nome completo *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={handleNameChange}
                  placeholder="Digite seu nome completo (mínimo 3 caracteres)"
                  required
                  className={nameError ? "border-red-500" : ""}
                />
                {nameError && (
                  <p className="text-sm text-red-500">{nameError}</p>
                )}
                {customerName.trim().length > 0 && customerName.trim().length < 3 && (
                  <p className="text-sm text-yellow-600">
                    {3 - customerName.trim().length} caractere(s) restante(s)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">E-mail (opcional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <Button 
                onClick={processPayment} 
                disabled={processingPayment || !isNameValid}
                className="w-full"
                size="lg"
              >
                {processingPayment ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Pagar com PIX
                  </>
                )}
              </Button>
              {!isNameValid && customerName && (
                <p className="text-xs text-muted-foreground text-center">
                  O nome deve ter pelo menos 3 caracteres para continuar
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {paymentStatus.paid ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-treexpay-green" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-treexpay-green mb-2">
                      Pagamento Confirmado! ✅
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Seu pagamento foi processado com sucesso
                    </p>
                    {paymentStatus.paidAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Pago em: {new Date(paymentStatus.paidAt).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 text-sm bg-treexpay-green/10 p-4 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">Produto:</span>
                      <span>{checkout.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Valor:</span>
                      <span>{formatCurrency(checkout.amount)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">PIX Gerado!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Escaneie o QR Code ou copie o código PIX
                    </p>
                    {checkingPayment && (
                      <p className="text-xs text-treexpay-medium flex items-center justify-center gap-1">
                        <Loader className="h-3 w-3 animate-spin" />
                        Verificando pagamento...
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <img 
                      src={qrImage(pixData.qrcode)} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 rounded border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixCode">PIX Copia e Cola</Label>
                    <div className="flex gap-2">
                      <Input
                        id="pixCode"
                        type="text"
                        value={pixData.qrcode}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        onClick={copyPixCode}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Produto:</span>
                      <span>{checkout.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Valor:</span>
                      <span>{formatCurrency(checkout.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Expira em:</span>
                      <span>{fmtDate(pixData.expiresAt)}</span>
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground bg-blue-50 p-3 rounded">
                    <p className="flex items-center justify-center gap-2">
                      <Loader className="h-4 w-4 animate-spin" />
                      Aguardando confirmação do pagamento...
                    </p>
                    <p className="text-xs mt-1">
                      O status será atualizado automaticamente
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
