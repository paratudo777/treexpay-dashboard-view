import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader, QrCode } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { qrImage, fmtDate } from "@/utils/pixHelpers";

interface PixResponse {
  success: boolean;
  deposit: any;
  provider?: string;
  pix?: {
    qrCode: string;
    qrCodeText: string;
    expiresAt: string;
  };
  // Legacy novaera format fallback
  novaera?: {
    data: {
      pix: {
        qrcode: string;
        qrcodeText: string;
        expiresAt: string;
      };
    };
  };
}

function extractPix(data: PixResponse) {
  if (data.pix) {
    return { qrCode: data.pix.qrCode, qrCodeText: data.pix.qrCodeText, expiresAt: data.pix.expiresAt };
  }
  if (data.novaera?.data?.pix) {
    return { qrCode: data.novaera.data.pix.qrcode, qrCodeText: data.novaera.data.pix.qrcodeText, expiresAt: data.novaera.data.pix.expiresAt };
  }
  return null;
}

export const PixDeposit = () => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const generatePix = async () => {
    if (!user) {
      toast({ title: "Erro de autenticação", description: "Você precisa estar logado para gerar um PIX.", variant: "destructive" });
      return;
    }

    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      toast({ title: "Valor inválido", description: "Por favor, insira um valor válido para depósito.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('novaera-pix-deposit', {
        body: {
          amount: amountValue,
          userId: user.id,
          userName: profile?.name || user.email || 'Usuário',
          userEmail: user.email,
          userPhone: "11999999999",
          userCpf: "12345678900"
        }
      });

      if (error) throw error;
      if (data.success) {
        setPixData(data);
        toast({ title: "PIX gerado com sucesso!", description: "Utilize o QR Code para realizar o pagamento." });
      } else {
        throw new Error(data.error || "Erro ao gerar PIX");
      }
    } catch (error) {
      toast({ title: "Erro ao gerar PIX", description: "Ocorreu um erro ao gerar o código PIX. Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const pix = pixData ? extractPix(pixData) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Depósito via PIX{pixData?.provider ? ` - ${pixData.provider}` : ''}
        </CardTitle>
        <CardDescription>
          Gere um código PIX para depositar valores em sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pixData ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do depósito (R$)</Label>
              <Input id="amount" type="number" placeholder="0,00" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button onClick={generatePix} disabled={isLoading} className="w-full">
              {isLoading ? (<><Loader className="h-4 w-4 mr-2 animate-spin" />Gerando PIX...</>) : "Gerar PIX"}
            </Button>
          </div>
        ) : pix ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <img src={qrImage(pix.qrCodeText || pix.qrCode)} alt="QR Code PIX" className="mx-auto w-48 rounded" />
              <div className="w-full space-y-2">
                <div className="flex justify-between"><span className="font-medium">Valor:</span><span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(amount))}</span></div>
                <div className="flex justify-between"><span className="font-medium">Recebedor:</span><span>Treex Tecnologia</span></div>
                {pix.expiresAt && <div className="flex justify-between"><span className="font-medium">Expira em:</span><span>{fmtDate(pix.expiresAt)}</span></div>}
              </div>
            </div>
            <Button variant="outline" onClick={() => { setPixData(null); setAmount(''); }} className="w-full">Gerar novo PIX</Button>
          </div>
        ) : (
          <p className="text-muted-foreground">Erro ao processar dados do PIX.</p>
        )}
      </CardContent>
    </Card>
  );
};
