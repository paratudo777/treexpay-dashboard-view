
import { Bell, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export function Header() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { notifications } = useProfile();
  
  const unreadNotifications = notifications?.filter(n => !n.read) || [];
  const hasNotifications = unreadNotifications.length > 0;
  
  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <header className="h-16 border-b border-border flex items-center justify-end px-4 gap-2">
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
          {notifications && notifications.length > 0 ? (
            notifications.slice(0, 3).map((notification) => (
              <DropdownMenuItem key={notification.id}>
                {notification.content}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem className="text-muted-foreground text-sm">
              Nenhuma notificação
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-muted-foreground text-xs text-center cursor-pointer"
            onClick={() => navigate("/perfil")}
          >
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
          <DropdownMenuItem onClick={() => navigate("/dashboard")}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
