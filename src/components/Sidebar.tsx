import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, FileText, Wallet, LogOut, Settings, Trophy, CreditCard, ShoppingCart, Code } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transações', href: '/transactions', icon: FileText },
  { name: 'Depósitos', href: '/depositos', icon: Wallet },
  { name: 'Checkouts', href: '/checkouts', icon: ShoppingCart },
  { name: 'Financeiro', href: '/financeiro', icon: Wallet },
  { name: 'Ranking', href: '/ranking', icon: Trophy },
  { name: 'API', href: '/api', icon: Code },
  { name: 'Administração', href: '/admin', icon: Settings, adminOnly: true },
  { name: 'Solicitações de Saque', href: '/admin/saques', icon: CreditCard, adminOnly: true },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { logout, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (href: string) => {
    navigate(href);
    if (onNavigate) onNavigate();
  };

  const handleLogout = () => {
    logout();
    if (onNavigate) onNavigate();
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.adminOnly) return true;
    return isAdmin;
  });

  return (
    <div className="h-screen bg-sidebar flex flex-col border-r border-sidebar-border w-64">
      {/* Logo */}
      <div className="p-4 flex items-center justify-center h-16 border-b border-sidebar-border">
        <img
          alt="TreexPay"
          src="/lovable-uploads/68727f7e-be18-4989-bf6e-2bab257119ad.png"
          className="h-10 w-10 mr-2 object-contain ml-[-95px]"
        />
        <div className="text-primary font-bold text-2xl tracking-tight">Nova Central</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map(item => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    "flex items-center w-full p-2.5 rounded-lg transition-all duration-200 ease-out group",
                    isActive
                      ? "gradient-primary text-primary-foreground shadow-md glow-primary-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                  <span className="ml-3 font-medium">{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2.5 rounded-lg text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="ml-3 font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
}
