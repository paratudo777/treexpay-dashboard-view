
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  Wallet, 
  User, 
  Bell, 
  ShoppingCart, 
  LogOut 
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transações', href: '/transactions', icon: FileText },
  { name: 'TEF', href: '/tef', icon: CreditCard },
  { name: 'Financeiro', href: '/financeiro', icon: Wallet },
  { name: 'Perfil', href: '/perfil', icon: User },
  { name: 'Minhas Taxas', href: '/taxas', icon: FileText },
  { name: 'Checkouts', href: '/checkouts', icon: ShoppingCart },
  { name: 'Notificações', href: '/notificações', icon: Bell },
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={cn(
      "h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="p-4 flex items-center justify-center h-16 border-b border-sidebar-border">
        {collapsed ? (
          <div className="text-treexpay-medium font-bold text-2xl">T</div>
        ) : (
          <div className="text-treexpay-medium font-bold text-2xl">TreexPay</div>
        )}
      </div>

      {/* Toggle button for mobile */}
      {isMobile && (
        <button 
          onClick={toggleSidebar}
          className="absolute top-4 right-4 p-2 rounded-full bg-sidebar-accent text-sidebar-accent-foreground"
        >
          {collapsed ? "→" : "←"}
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.name}>
                <button
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "flex items-center w-full p-2 rounded-md transition-colors",
                    isActive 
                      ? "bg-sidebar-accent text-treexpay-medium" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={logout}
          className={cn(
            "flex items-center w-full p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Sair</span>}
        </button>
      </div>
    </div>
  );
}
