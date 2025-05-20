
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Bell, FileText } from "lucide-react";

// Dados mockados
const mockUserData = {
  name: "João Silva",
  email: "joao.silva@exemplo.com",
  balance: 3164.31,
};

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

export default function Perfil() {
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

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-treexpay-medium mb-6">Perfil</h1>
        
        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-3 mb-4">
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
          </TabsList>
          
          {/* Informações do usuário */}
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
                    <span className="font-medium">{mockUserData.name}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">E-mail</span>
                    <span className="font-medium">{mockUserData.email}</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm text-muted-foreground">Saldo Atual</span>
                    <span className="text-xl font-bold text-treexpay-medium">
                      {formatCurrency(mockUserData.balance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
