import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { QrCode, Loader, Copy, CheckCircle, CreditCard, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { qrImage } from '@/utils/pixHelpers';

interface CheckoutData {
  id: string;
  title: string;
  description: string;
  amount: number;
  image_url: string;
  url_slug: string;
  active: boolean;
}

interface PixData {
  qrcode: string;
  qrcodeText: string;
  expiresAt: string;
}

export default function CheckoutPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'expired'>('pending');
  const [paymentId, setPaymentId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos em segundos
  const [timerStarted, setTimerStarted] = useState(false);
  const { toast } = useToast();

  // Dados do cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCpf, setCardCpf] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    if (slug) {
      fetchCheckout();
    }
  }, [slug]);

  // Debug: Log render e payment method changes
  useEffect(() => {
    console.log('🎨 CheckoutPublic renderizou:', { 
      loading, 
      checkout: checkout?.title,
      paymentMethod,
      pixData: !!pixData,
      paymentStatus,
      processingPayment
    });
  });

  useEffect(() => {
    console.log('🔧 Payment method mudou para:', paymentMethod);
    if (paymentMethod === 'credit_card') {
      console.log('💳 Campos do cartão devem estar visíveis agora');
    }
  }, [paymentMethod]);

  // Timer countdown
  useEffect(() => {
    if (!timerStarted || timeLeft <= 0 || paymentStatus === 'paid') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, timeLeft, paymentStatus]);

  // Realtime subscription
  useEffect(() => {
    if (!checkout || !paymentId) return;

    const paymentsChannel = supabase
      .channel('checkout-payments-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'checkout_payments',
          filter: `checkout_id=eq.${checkout.id}`
        },
        (payload) => {
          const newRecord = payload.new as any;
          
          if (newRecord.status === 'paid') {
            setPaymentStatus('paid');
            
            toast({
              title: "Pagamento confirmado! ✅",
              description: "Seu pagamento foi processado com sucesso.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
    };
  }, [checkout, paymentId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar checkout.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processPixPayment = async () => {
    if (!checkout) return;

    if (!customerName.trim() || customerName.trim().length < 3) {
      toast({
        variant: "destructive",
        title: "Nome inválido",
        description: "Digite um nome com pelo menos 3 caracteres.",
      });
      return;
    }

    setProcessingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke('checkout-pix-payment', {
        body: {
          checkoutSlug: checkout.url_slug,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setPixData(data.pix);
        setPaymentId(data.payment.id);
        setTimerStarted(true);
        
        toast({
          title: "PIX gerado com sucesso!",
          description: "Utilize o QR Code para realizar o pagamento.",
        });
      } else {
        throw new Error(data.error || "Erro ao gerar PIX");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PIX",
        description: "Ocorreu um erro ao gerar o código PIX. Tente novamente.",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const processCardPayment = async () => {
    if (!checkout) return;

    if (!customerName.trim() || !cardNumber || !cardCvv || !cardExpiry || !cardCpf) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Preencha todos os campos do cartão.",
      });
      return;
    }

    setProcessingPayment(true);
    setTimerStarted(true);

    // Mock: verificar se é o cartão específico de aprovação
    const isApprovedCard = 
      cardNumber.replace(/\s/g, '') === '4282673585409068' &&
      cardCvv === '867' &&
      cardExpiry === '06/27' &&
      cardCpf.replace(/\D/g, '') === '01423842243';

    if (isApprovedCard) {
      // Loading de 8 segundos
      await new Promise(resolve => setTimeout(resolve, 8000));
      setPaymentStatus('paid');
      toast({
        title: "Pagamento aprovado! ✅",
        description: "Seu produto será enviado no Gmail informado.",
      });
    } else {
      // Loading de 9 segundos
      await new Promise(resolve => setTimeout(resolve, 9000));
      setProcessingPayment(false);
      setTimerStarted(false);
      toast({
        variant: "destructive",
        title: "Pagamento recusado",
        description: "Recomendamos que você pague com o meio de pagamento e dispositivo que costuma usar para compras on-line.",
      });
    }

    setProcessingPayment(false);
  };

  const copyPixCode = async () => {
    if (pixData?.qrcode) {
      await navigator.clipboard.writeText(pixData.qrcode);
      toast({
        title: "Código copiado!",
        description: "O código PIX foi copiado para a área de transferência.",
      });
    }
  };

  const restartCheckout = () => {
    setPixData(null);
    setPaymentStatus('pending');
    setTimeLeft(600);
    setTimerStarted(false);
    setPaymentId('');
    setCustomerName('');
    setCustomerEmail('');
    setCardNumber('');
    setCardCvv('');
    setCardExpiry('');
    setCardCpf('');
    setCardName('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Produto não encontrado
            </h1>
            <p className="text-muted-foreground">
              Este link de pagamento não existe ou está inativo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner vermelho de tempo limitado */}
      {timerStarted && paymentStatus !== 'paid' && (
        <div className="bg-destructive text-destructive-foreground py-3 px-4 text-center font-semibold flex items-center justify-center gap-2">
          <Clock className="h-5 w-5 animate-pulse" />
          Oferta por tempo limitado! {formatTime(timeLeft)}
        </div>
      )}

      <div className="flex items-center justify-center p-4 py-8">
        <Card className="w-full max-w-2xl">
          {paymentStatus === 'paid' ? (
            // Tela de sucesso
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-20 w-20 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-green-500 mb-2">
                    Pagamento Confirmado! ✅
                  </h3>
                  <p className="text-muted-foreground">
                    Seu pagamento foi processado com sucesso
                  </p>
                  {paymentMethod === 'credit_card' && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Seu produto será enviado no Gmail informado.
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-sm bg-accent/50 p-4 rounded border border-accent">
                  {checkout.image_url && (
                    <img 
                      src={checkout.image_url} 
                      alt={checkout.title}
                      className="w-full h-48 object-cover rounded mb-4"
                    />
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Produto:</span>
                    <span>{checkout.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Valor:</span>
                    <span>{formatCurrency(checkout.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Método:</span>
                    <span>{paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          ) : paymentStatus === 'expired' ? (
            // Tela de expirado
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <AlertCircle className="h-20 w-20 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-yellow-500 mb-2">
                    Tempo esgotado!
                  </h3>
                  <p className="text-muted-foreground">
                    O tempo para pagamento expirou. Você pode reiniciar o checkout.
                  </p>
                </div>
                <Button onClick={restartCheckout} size="lg">
                  Reiniciar Checkout
                </Button>
              </div>
            </CardContent>
          ) : pixData && paymentMethod === 'pix' ? (
            // Tela do PIX gerado
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">PIX Gerado!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Escaneie o QR Code ou copie o código PIX
                </p>
              </div>
              <div className="flex justify-center">
                <img 
                  src={qrImage(pixData.qrcode)} 
                  alt="QR Code PIX" 
                  className="w-64 h-64 rounded border"
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
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-center text-sm bg-accent/50 p-3 rounded border border-accent">
                <p className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader className="h-4 w-4 animate-spin" />
                  Aguardando confirmação do pagamento...
                </p>
              </div>
            </CardContent>
          ) : processingPayment ? (
            // Tela de loading
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader className="h-16 w-16 mx-auto animate-spin text-primary" />
                <p className="text-lg font-medium">Processando pagamento...</p>
                <p className="text-sm text-muted-foreground">Aguarde alguns instantes</p>
              </div>
            </CardContent>
          ) : (
            // Formulário inicial
            <>
              <CardHeader className="text-center">
                {checkout.image_url && (
                  <div className="mb-4">
                    <img 
                      src={checkout.image_url} 
                      alt={checkout.title}
                      className="w-full h-64 object-cover rounded-lg"
                      onError={(e) => {
                        console.error('❌ Erro ao carregar imagem:', checkout.image_url);
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('✅ Imagem carregada com sucesso:', checkout.image_url);
                      }}
                    />
                  </div>
                )}
                <CardTitle className="text-2xl">{checkout.title}</CardTitle>
                {checkout.description && (
                  <CardDescription className="text-left mt-2">
                    {checkout.description}
                  </CardDescription>
                )}
                <CardDescription className="text-2xl font-bold text-primary mt-2">
                  {formatCurrency(checkout.amount)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Seu nome completo *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Digite seu nome completo"
                    required
                  />
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

                <div className="space-y-3">
                  <Label>Forma de Pagamento</Label>
                  <RadioGroup 
                    value={paymentMethod} 
                    onValueChange={(v) => {
                      console.log('🔄 RadioGroup onValueChange chamado com:', v);
                      const newMethod = v as 'pix' | 'credit_card';
                      console.log('🔄 Setando paymentMethod para:', newMethod);
                      setPaymentMethod(newMethod);
                      console.log('🔄 PaymentMethod setado!');
                    }}
                  >
                    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="pix" id="pix" />
                      <Label htmlFor="pix" className="cursor-pointer flex items-center gap-2 flex-1">
                        <QrCode className="h-4 w-4" />
                        PIX
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="credit_card" id="credit_card" />
                      <Label htmlFor="credit_card" className="cursor-pointer flex items-center gap-2 flex-1">
                        <CreditCard className="h-4 w-4" />
                        Cartão de Crédito
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Número do Cartão *</Label>
                      <Input
                        id="cardNumber"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="cardExpiry">Validade *</Label>
                        <Input
                          id="cardExpiry"
                          value={cardExpiry}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length >= 2) {
                              value = value.slice(0, 2) + '/' + value.slice(2, 4);
                            }
                            setCardExpiry(value);
                          }}
                          placeholder="MM/AA"
                          maxLength={5}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardCvv">CVV *</Label>
                        <Input
                          id="cardCvv"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          placeholder="000"
                          maxLength={3}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardName">Nome no Cartão *</Label>
                      <Input
                        id="cardName"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        placeholder="NOME COMO ESTÁ NO CARTÃO"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardCpf">CPF *</Label>
                      <Input
                        id="cardCpf"
                        value={cardCpf}
                        onChange={(e) => setCardCpf(formatCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        required
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={paymentMethod === 'pix' ? processPixPayment : processCardPayment}
                  disabled={processingPayment || !customerName.trim()}
                  className="w-full"
                  size="lg"
                >
                  {processingPayment ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : paymentMethod === 'pix' ? (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar PIX
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar com Cartão
                    </>
                  )}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}