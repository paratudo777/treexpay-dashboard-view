
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import treexPayLogo from '@/assets/treexpay-logo.png';
import { LayoutDashboard, FileText, Wallet, LogOut, Settings, Trophy, CreditCard, ShoppingCart, Code, Users, ArrowRightLeft, UserPlus, ChevronDown, Landmark } from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  children?: NavItem[];
};

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transações', href: '/transactions', icon: FileText },
  { name: 'Depósitos', href: '/depositos', icon: Wallet },
  { name: 'Checkouts', href: '/checkouts', icon: ShoppingCart },
  { name: 'Financeiro', href: '/financeiro', icon: Wallet },
  { name: 'Ranking', href: '/ranking', icon: Trophy },
  { name: 'API', href: '/api', icon: Code },
  { 
    name: 'Administração', 
    href: '/admin', 
    icon: Settings, 
    adminOnly: true,
    children: [
      { name: 'Usuários', href: '/admin/usuarios', icon: Users },
      { name: 'Transações', href: '/admin/transacoes', icon: ArrowRightLeft },
      { name: 'Criar Usuário', href: '/admin/criar-usuario', icon: UserPlus },
      { name: 'Solicitações de Saque', href: '/admin/saques', icon: CreditCard },
      { name: 'Adquirentes', href: '/admin/adquirentes', icon: Landmark },
    ]
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith('/admin'));

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
          src={treexPayLogo}
          className="h-10 w-10 mr-2 object-contain ml-[-95px]"
        />
        <div className="text-primary font-bold text-2xl tracking-tight">TreexPay</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map(item => {
            const isActive = location.pathname === item.href;
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive = hasChildren && item.children!.some(c => location.pathname === c.href);

            if (hasChildren) {
              return (
                <li key={item.name}>
                  <button
                    onClick={() => setAdminOpen(!adminOpen)}
                    className={cn(
                      "flex items-center w-full p-2.5 rounded-lg transition-all duration-200 ease-out group",
                      (isActive || isChildActive)
                        ? "gradient-primary text-primary-foreground shadow-md glow-primary-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 transition-transform duration-200", !(isActive || isChildActive) && "group-hover:scale-110")} />
                    <span className="ml-3 font-medium flex-1 text-left">{item.name}</span>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      adminOpen && "rotate-180"
                    )} />
                  </button>
                  {/* Submenu */}
                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    adminOpen ? "max-h-60 opacity-100 mt-1" : "max-h-0 opacity-0"
                  )}>
                    <ul className="ml-4 pl-3 border-l border-sidebar-border/50 space-y-1">
                      {item.children!.map(child => {
                        const isSubActive = location.pathname === child.href;
                        return (
                          <li key={child.name}>
                            <button
                              onClick={() => handleNavigation(child.href)}
                              className={cn(
                                "flex items-center w-full p-2 rounded-lg text-sm transition-all duration-200 ease-out group",
                                isSubActive
                                  ? "bg-primary/20 text-primary font-semibold"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1"
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span className="ml-2">{child.name}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              );
            }

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
