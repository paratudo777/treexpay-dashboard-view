
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Loader } from 'lucide-react';
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

export default function CheckoutPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchCheckout();
    }
  }, [slug]);

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
    if (!checkout || !customerName.trim()) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Por favor, preencha seu nome.",
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
                <Label htmlFor="customerName">Seu nome *</Label>
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
              <Button 
                onClick={processPayment} 
                disabled={processingPayment || !customerName.trim()}
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
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">PIX Gerado!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Escaneie o QR Code ou copie o código PIX
                </p>
              </div>
              <div className="flex justify-center">
                <img 
                  src={qrImage(pixData.qrcodeText)} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 rounded border"
                />
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
              <div className="text-center text-sm text-muted-foreground">
                <p>Aguardando confirmação do pagamento...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
