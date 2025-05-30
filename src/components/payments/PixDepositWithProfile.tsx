import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader, QrCode, AlertCircle, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isValidCpf, formatCpf, formatPhone } from "@/utils/cpfValidation";
import { qrImage } from "@/utils/pixHelpers";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
}

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
        expirationDate: string;
      };
      externalId: string;
    };
  };
}

export const PixDepositWithProfile = () => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixDepositResponse | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone, cpf')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUserProfile(data);
      setPhone(data.phone || '');
      setCpf(data.cpf || '');
    } catch (error) {
      toast({
        title: "Erro ao carregar perfil",
        description: "Não foi possível carregar suas informações de perfil.",
        variant: "destructive",
      });
    }
  };

  const updateUserProfile = async () => {
    if (!user) return;

    if (!isValidCpf(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    const phoneNumbers = phone.replace(/\D/g, '');
    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, insira um telefone válido.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumbers,
          cpf: cpf.replace(/\D/g, '')
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchUserProfile();
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const generatePix = async () => {
    if (!user || !userProfile) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para gerar um PIX.",
        variant: "destructive",
      });
      return;
    }

    const amountValue = parseFloat(amount);
    
    if (!amount || isNaN(amountValue) || amountValue <= 0 || amountValue > 50000) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido entre R$ 0,01 e R$ 50.000,00.",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile.phone || !userProfile.cpf) {
      toast({
        title: "Perfil incompleto",
        description: "Por favor, complete seus dados de telefone e CPF antes de gerar um PIX.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('novaera-pix-deposit', {
        body: {
          amount: amountValue,
          userId: user.id,
          userName: userProfile.name,
          userEmail: userProfile.email,
          userPhone: userProfile.phone,
          userCpf: userProfile.cpf
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

  const copyPixCode = async () => {
    if (pixData?.novaera.data.pix.qrcode) {
      try {
        await navigator.clipboard.writeText(pixData.novaera.data.pix.qrcode);
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

  const isProfileComplete = userProfile?.phone && userProfile?.cpf;

  return (
    <div className="space-y-6">
      {!isProfileComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Complete seu perfil
            </CardTitle>
            <CardDescription>
              Para gerar um PIX, você precisa completar seus dados de telefone e CPF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formatCpf(cpf)}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                  maxLength={14}
                />
              </div>
            </div>
            <Button 
              onClick={updateUserProfile} 
              disabled={isUpdatingProfile}
              className="w-full"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar perfil"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Depósito via PIX
          </CardTitle>
          <CardDescription>
            Gere um código PIX exclusivo para adicionar saldo à sua conta de forma rápida e segura. O valor será liberado automaticamente após a confirmação do pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isProfileComplete && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Complete seus dados de telefone e CPF acima para habilitar a geração de PIX.
              </AlertDescription>
            </Alert>
          )}

          {!pixData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor do depósito (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0,00"
                  min="0.01"
                  max="50000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button 
                onClick={generatePix} 
                disabled={isLoading || !isProfileComplete}
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
                  src={qrImage(pixData.novaera.data.pix.qrcode)} 
                  alt="QR Code PIX" 
                  className="mx-auto w-40 md:w-56 rounded" 
                />
                
                <div className="w-full">
                  <div className="flex justify-between">
                    <span className="font-medium">Valor:</span>
                    <span>{formatCurrency(parseFloat(amount))}</span>
                  </div>
                </div>

                <div className="w-full space-y-2">
                  <Label htmlFor="pixCode">PIX Copia e Cola</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pixCode"
                      type="text"
                      value={pixData.novaera.data.pix.qrcode}
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
              </div>
              
              <Button variant="outline" onClick={newPix} className="w-full">
                Gerar novo PIX
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
