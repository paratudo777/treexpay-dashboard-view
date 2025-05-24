
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/useProfile";

export function NotificationsTab() {
  const { profile, notifications, updateNotifications } = useProfile();

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

  return (
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
  );
}
