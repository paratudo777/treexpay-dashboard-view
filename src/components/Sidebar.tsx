
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Wallet, 
  LogOut,
  Settings,
  MessageSquare
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from './ui/button';

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
  { name: 'Financeiro', href: '/financeiro', icon: Wallet },
  { name: 'Administração', href: '/admin', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/5518991913165', '_blank');
  };

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
          {filteredNavItems.map((item) => {
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

      {/* Support and Logout buttons */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {/* Support button */}
        <Button
          onClick={openWhatsApp}
          className={cn(
            "w-full bg-treexpay-dark hover:bg-treexpay-medium flex items-center gap-2",
            collapsed ? "px-2" : "px-4"
          )}
          size={collapsed ? "icon" : "default"}
        >
          <MessageSquare className="h-4 w-4" />
          {!collapsed && <span>Falar com o Suporte</span>}
        </Button>
        
        {/* Logout button */}
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
