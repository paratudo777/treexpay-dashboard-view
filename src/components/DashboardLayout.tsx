
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';
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

  return (
    <div className="flex h-screen bg-background dark">
      {/* Sidebar for desktop, or when toggled on mobile */}
      {(sidebarOpen || !isMobile) && (
        <div className={cn(
          "fixed inset-0 z-40 lg:static lg:z-auto", 
          isMobile ? "flex" : "hidden lg:flex"
        )}>
          <Sidebar />
          
          {/* Backdrop for mobile - removido o blur que causava o efeito borrado */}
          {isMobile && (
            <div 
              className="fixed inset-0 bg-background/80" 
              onClick={() => setSidebarOpen(false)} 
            />
          )}
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
        
        {/* Page content - removido o botão de suporte daqui */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
