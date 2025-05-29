
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({
  children
}: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const layoutRef = useRef<HTMLDivElement>(null);

  const handleSidebarNavigation = () => {
    // Sempre fechar a sidebar após navegação, sem condições
    setSidebarOpen(false);
  };

  // Garantir limpeza adequada dos event listeners
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen && layoutRef.current) {
        const target = event.target as Node;
        if (!layoutRef.current.contains(target)) {
          setSidebarOpen(false);
        }
      }
    };

    if (isMobile && sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, sidebarOpen]);

  // Limpar estado ao desmontar
  useEffect(() => {
    return () => {
      setSidebarOpen(false);
    };
  }, []);

  return (
    <div ref={layoutRef} className="flex h-screen bg-background dark">
      {/* Backdrop for mobile - deve ficar atrás do sidebar */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 z-40" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar for desktop, or when toggled on mobile */}
      {(sidebarOpen || !isMobile) && (
        <div className={cn(
          "lg:static lg:z-auto transition-transform duration-300 ease-in-out", 
          isMobile ? "fixed inset-y-0 left-0 z-50" : "hidden lg:block",
          isMobile && !sidebarOpen ? "transform -translate-x-full" : "transform translate-x-0"
        )}>
          <Sidebar onNavigate={handleSidebarNavigation} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header with menu button */}
        {isMobile ? (
          <header className="h-16 border-b border-border flex items-center px-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2 rounded-md hover:bg-accent"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <div className="ml-4 text-xl font-semibold text-treexpay-medium">TreexPay</div>
            <div className="ml-auto">
              <Header />
            </div>
          </header>
        ) : (
          <Header />
        )}
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
