
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Header() {
  const navigate = useNavigate();
  
  return (
    <header className="h-16 border-b border-border flex items-center justify-end px-4">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => navigate("/perfil")} 
        className="text-treexpay-medium hover:text-treexpay-dark"
      >
        <User className="h-6 w-6" />
        <span className="sr-only">Perfil</span>
      </Button>
    </header>
  );
}
