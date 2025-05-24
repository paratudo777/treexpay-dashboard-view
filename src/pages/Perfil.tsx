
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, FileText, Shield, Key, Book } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isValidCpf, formatCpf, formatPhone } from "@/utils/cpfValidation";

// Dados mockados para demonstração
const mockFeesData = {
  depositFee: "1.99%",
  withdrawalFee: "2.50%",
};

const mockNotifications = [
  { id: 1, message: "Depósito de R$ 1000,00 realizado com sucesso", date: "2025-05-18T14:30:00" },
  { id: 2, message: "Saque de R$ 500,00 processado", date: "2025-05-17T10:15:00" },
  { id: 3, message: "Novo login detectado", date: "2025-05-16T20:45:00" },
  { id: 4, message: "Alteração de senha realizada", date: "2025-05-15T08:30:00" },
  { id: 5, message: "Depósito de R$ 200,00 realizado com sucesso", date: "2025-05-12T16:20:00" },
];

interface UserProfile {
  id: string;
  name: string;
  email: string;
  balance: number;
  phone?: string;
  cpf?: string;
}

export default function Perfil() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
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
        .select('id, name, email, balance, phone, cpf')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUserProfile(data);
      setPhone(data.phone || '');
      setCpf(data.cpf || '');
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    // Validar CPF se fornecido
    if (cpf && !isValidCpf(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, insira um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    // Validar telefone se fornecido
    const phoneNumbers = phone.replace(/\D/g, '');
    if (phone && (phoneNumbers.length < 10 || phoneNumbers.length > 11)) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, insira um telefone válido.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumbers || null,
          cpf: cpf.replace(/\D/g, '') || null
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchUserProfile();
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleToggleNotifications = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    
    toast({
      title: newState ? "Notificações ativadas" : "Notificações desativadas",
      description: newState 
        ? "Você receberá notificações sobre suas vendas." 
        : "Você não receberá notificações sobre suas vendas.",
    });
  };

  const handleEnable2FA = () => {
    setShowQRCode(true);
  };

  const handleVerify2FA = () => {
    if (twoFACode.length === 6) {
      toast({
        title: "Google Authenticator ativado",
        description: "A autenticação de dois fatores foi habilitada com sucesso.",
      });
      setShowQRCode(false);
      setTwoFACode('');
    } else {
      toast({
        variant: "destructive",
        title: "Código inválido",
        description: "Por favor, insira um código válido de 6 dígitos.",
      });
    }
  };

  const openDocumentation = () => {
    window.open('https://docs.treexpay.com', '_blank');
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Perfil</h1>
        
        {/* Documentation API Button */}
        <div className="mb-6">
          <Button 
            onClick={openDocumentation}
            className="flex items-center gap-2 bg-treexpay-dark hover:bg-treexpay-medium"
          >
            <Book className="h-4 w-4" />
            <span>Documentação da API</span>
          </Button>
        </div>
        
        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Informações</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Minhas Taxas</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Segurança</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Informações do usuário */}
          <TabsContent value="info">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                  <CardDescription>Seus dados pessoais e saldo atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">Nome</span>
                      <span className="font-medium">{userProfile?.name || "Carregando..."}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">E-mail</span>
                      <span className="font-medium">{userProfile?.email || "Carregando..."}</span>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm text-muted-foreground">Saldo Atual</span>
                      <span className="text-xl font-bold text-treexpay-medium">
                        {userProfile ? formatCurrency(userProfile.balance) : "Carregando..."}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dados para PIX</CardTitle>
                  <CardDescription>
                    Complete seus dados de telefone e CPF para habilitar depósitos via PIX
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                    onClick={updateProfile} 
                    disabled={isUpdating}
                    className="w-full md:w-auto"
                  >
                    {isUpdating ? "Salvando..." : "Salvar Dados"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Minhas Taxas */}
          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>Minhas Taxas</CardTitle>
                <CardDescription>Taxas aplicadas às suas transações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Taxa de Depósito</span>
                    <span className="text-treexpay-medium">{mockFeesData.depositFee}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Taxa de Saque</span>
                    <span className="text-treexpay-medium">{mockFeesData.withdrawalFee}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notificações */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Notificações</CardTitle>
                  <CardDescription>Defina suas preferências de notificação</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Deseja receber notificações sobre suas vendas?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Você receberá notificações de vendas pendentes e aprovadas.
                      </p>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={handleToggleNotifications}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notificações Recentes</CardTitle>
                  <CardDescription>Suas últimas 5 notificações</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {mockNotifications.map((notification) => (
                      <li key={notification.id} className="p-3 rounded-md bg-secondary">
                        <div className="flex flex-col">
                          <span className="font-medium">{notification.message}</span>
                          <span className="text-sm text-muted-foreground mt-1">
                            {formatDate(notification.date)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Segurança - Autenticação de dois fatores */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Autenticação de Dois Fatores</CardTitle>
                <CardDescription>Proteja sua conta com uma camada extra de segurança</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!showQRCode ? (
                  <div className="flex flex-col gap-4">
                    <p>
                      A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta,
                      exigindo não apenas a sua senha, mas também um código único gerado pelo seu 
                      dispositivo móvel.
                    </p>
                    <Button onClick={handleEnable2FA} className="w-full md:w-auto">
                      <Key className="mr-2 h-4 w-4" />
                      Ativar Google Authenticator
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        Escaneie o QR Code abaixo com seu aplicativo Google Authenticator
                        e depois insira o código de 6 dígitos para confirmar.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex justify-center py-4">
                      <div className="bg-white p-4 rounded-md">
                        <div className="w-48 h-48 bg-[url('data:image/png;base64,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')]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twoFACode">Código de verificação</Label>
                      <Input 
                        id="twoFACode"
                        type="text"
                        maxLength={6}
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value)}
                        placeholder="Digite o código de 6 dígitos"
                        className="w-full"
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button variant="outline" onClick={() => setShowQRCode(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleVerify2FA}>
                        Verificar e Ativar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
