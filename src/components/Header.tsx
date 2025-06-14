
import { Bell, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserBalance } from "@/hooks/useUserBalance";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { balance, loading } = useUserBalance();
  const [hasNotifications] = useState(true);
  
  const getUserDisplayName = () => {
    if (profile?.name && profile.name !== user?.email) {
      return profile.name;
    }
    return 'Usuário';
  };
  
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-muted-foreground">
          Bem-vindo, {getUserDisplayName()}
        </span>
        {profile?.profile !== 'admin' && (
          <span className="text-sm text-treexpay-medium font-semibold">
            Saldo: {loading ? 'Carregando...' : `R$ ${balance.toFixed(2)}`}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="relative text-treexpay-medium hover:text-treexpay-dark"
            >
              <Bell className="h-5 w-5" />
              {hasNotifications && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
              )}
              <span className="sr-only">Notificações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Depósito de R$ 1000,00 realizado com sucesso
            </DropdownMenuItem>
            <DropdownMenuItem>
              Saque de R$ 500,00 processado
            </DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground text-xs text-center cursor-default">
              Ver todas no seu perfil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-treexpay-medium hover:text-treexpay-dark"
            >
              <User className="h-5 w-5" />
              <span className="sr-only">Perfil</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/perfil")}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
