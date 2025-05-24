
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, FileText, Shield, Key, Book } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";

export default function Perfil() {
  const { user } = useAuth();
  const { profile, settings, notifications, isLoading, updateNotifications } = useProfile();
  const [showQRCode, setShowQRCode] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  
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
    if (profile) {
      updateNotifications(!profile.notifications_enabled);
    }
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Perfil</h1>
        
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
          
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Usuário</CardTitle>
                <CardDescription>Seus dados pessoais e saldo atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Nome</span>
                    <span className="font-medium">{profile?.name || user?.name}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">E-mail</span>
                    <span className="font-medium">{profile?.email || user?.email}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Perfil</span>
                    <span className="font-medium capitalize">{profile?.profile || user?.profile}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Saldo Atual</span>
                    <span className="text-xl font-bold text-treexpay-medium">
                      {formatCurrency(Number(profile?.balance || user?.balance || 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
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
                    <span className="text-treexpay-medium">
                      {settings?.deposit_fee ? `${settings.deposit_fee}%` : '1.99%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Taxa de Saque</span>
                    <span className="text-treexpay-medium">
                      {settings?.withdrawal_fee ? `${settings.withdrawal_fee}%` : '2.50%'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
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
                      checked={profile?.notifications_enabled || false}
                      onCheckedChange={handleToggleNotifications}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notificações Recentes</CardTitle>
                  <CardDescription>Suas últimas notificações</CardDescription>
                </CardHeader>
                <CardContent>
                  {notifications && notifications.length > 0 ? (
                    <ul className="space-y-3">
                      {notifications.map((notification) => (
                        <li key={notification.id} className="p-3 rounded-md bg-secondary">
                          <div className="flex flex-col">
                            <span className="font-medium">{notification.content}</span>
                            <span className="text-sm text-muted-foreground mt-1">
                              {formatDate(notification.sent_date)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma notificação encontrada.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
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
                      {profile?.two_fa_enabled ? 'Reconfigurar' : 'Ativar'} Google Authenticator
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
