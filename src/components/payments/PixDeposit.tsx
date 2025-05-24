import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader, CreditCard, QrCode } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { qrImage, fmtDate } from "@/utils/pixHelpers";

interface PixDepositResponse {
  success: boolean;
  deposit: any;
  novaera: {
    data: {
      id: number;
      status: string;
      amount: number;
      pix: {
        qrcode: string;
        qrcodeText: string;
        expiresAt: string;
      };
      externalId: string;
    };
  };
}

export const PixDeposit = () => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixDepositResponse | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const generatePix = async () => {
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para gerar um PIX.",
        variant: "destructive",
      });
      return;
    }

    const amountValue = parseFloat(amount);
    
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para depósito.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Gerando PIX para valor:', amountValue);
      
      const { data, error } = await supabase.functions.invoke('novaera-pix-deposit', {
        body: {
          amount: amountValue,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userPhone: "11999999999", // You might want to get this from user profile
          userCpf: "12345678900" // You might want to get this from user profile
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setPixData(data);
        toast({
          title: "PIX gerado com sucesso!",
          description: "Utilize o QR Code para realizar o pagamento.",
        });
      } else {
        throw new Error(data.error || "Erro ao gerar PIX");
      }
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: "Ocorreu um erro ao gerar o código PIX. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const newPix = () => {
    setPixData(null);
    setAmount('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const extractPixKey = (qrcodeText: string) => {
    // Simplified extraction - in a real scenario you'd parse the PIX payload
    return "treex@tecnologia.com.br";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Depósito via PIX - NovaEra
        </CardTitle>
        <CardDescription>
          Gere um código PIX para depositar valores em sua conta usando a integração NovaEra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!pixData ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do depósito (R$)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0,00"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button 
              onClick={generatePix} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                "Gerar PIX"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <img 
                src={qrImage(pixData.novaera.data.pix.qrcodeText)} 
                alt="QR Code PIX" 
                className="mx-auto w-48 rounded" 
              />
              <div className="w-full space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Valor:</span>
                  <span>{formatCurrency(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Chave PIX:</span>
                  <span>{extractPixKey(pixData.novaera.data.pix.qrcodeText)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Recebedor:</span>
                  <span>Treex Tecnologia</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Expira em:</span>
                  <span>{fmtDate(pixData.novaera.data.pix.expiresAt)}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={newPix} className="w-full">
              Gerar novo PIX
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
