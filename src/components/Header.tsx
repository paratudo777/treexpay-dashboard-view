
import { Bell, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
  const [hasNotifications] = useState(true);
  
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

      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => navigate("/perfil")} 
        className="text-treexpay-medium hover:text-treexpay-dark"
      >
        <User className="h-5 w-5" />
        <span className="sr-only">Perfil</span>
      </Button>
    </header>
  );
}
