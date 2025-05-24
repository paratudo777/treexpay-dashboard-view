
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export function UserInfoTab() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
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
  );
}
