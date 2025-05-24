
import { useState } from 'react';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NovaEraPaymentTest } from "@/components/payments/NovaEraPaymentTest";
import { PixDeposit } from "@/components/payments/PixDeposit";

// Simulação da resposta da API
interface PixResponse {
  qrCode: string;
  pixKey: string;
  receiverName: string;
  amount: number;
}

const mockPixResponse = (amount: number): PixResponse => ({
  qrCode: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg",
  pixKey: "treex@tecnologia.com.br",
  receiverName: "Treex Tecnologia",
  amount
});

// Simulação da chamada à API Nova Era (Volutti)
const generatePix = async (amount: number): Promise<PixResponse> => {
  // Em um cenário real, aqui seria uma chamada real à API
  // usando a chave pública fornecida: pk_nNKqFhWdsslimygk6TLXLIopdTMLqBnXs_LY-fJtykvKE6Y8
  console.log("Gerando PIX com a chave pública: pk_nNKqFhWdsslimygk6TLXLIopdTMLqBnXs_LY-fJtykvKE6Y8");
  
  // Simulamos um pequeno delay para parecer uma chamada de API real
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockPixResponse(amount));
    }, 800);
  });
};

export default function Depositos() {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const { toast } = useToast();

  const handleGeneratePix = async () => {
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
      const response = await generatePix(amountValue);
      setPixData(response);
      toast({
        title: "PIX gerado com sucesso!",
        description: "Utilize o QR Code para realizar o pagamento.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar PIX",
        description: "Ocorreu um erro ao gerar o código PIX. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Depósitos</h1>
        
        {/* NovaEra PIX Deposit */}
        <PixDeposit />
        
        {/* NovaEra Payment Test */}
        <NovaEraPaymentTest />
        
        {/* Existing PIX deposit functionality */}
        <Card>
          <CardHeader>
            <CardTitle>Realizar Depósito (Simulação)</CardTitle>
            <CardDescription>Gere um código PIX para depositar valores em sua conta (versão de demonstração).</CardDescription>
          </CardHeader>
          <CardContent>
            {!pixData ? (
              <div className="flex flex-col gap-4">
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
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <img 
                  src={pixData.qrCode} 
                  alt="QR Code PIX" 
                  className="w-64 h-64" 
                />
                <div className="w-full space-y-2 mt-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Valor:</span>
                    <span>{formatCurrency(pixData.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Chave PIX:</span>
                    <span>{pixData.pixKey}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Recebedor:</span>
                    <span>{pixData.receiverName}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className={pixData ? "justify-center" : "justify-end"}>
            {!pixData ? (
              <Button 
                onClick={handleGeneratePix}
                disabled={isLoading}
              >
                {isLoading ? "Gerando..." : "Gerar PIX (Demo)"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setPixData(null)}>
                Gerar novo PIX
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
