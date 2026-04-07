
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
    setSidebarOpen(false);
  };

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

  useEffect(() => {
    return () => {
      setSidebarOpen(false);
    };
  }, []);

  return (
    <div ref={layoutRef} className="flex h-screen bg-background dark">
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {(sidebarOpen || !isMobile) && (
        <div className={cn(
          "lg:static lg:z-auto transition-transform duration-300 ease-in-out", 
          isMobile ? "fixed inset-y-0 left-0 z-50" : "hidden lg:block",
          isMobile && !sidebarOpen ? "transform -translate-x-full" : "transform translate-x-0"
        )}>
          <Sidebar onNavigate={handleSidebarNavigation} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile ? (
          <header className="h-16 border-b border-border flex items-center px-4 bg-card/50 backdrop-blur-md">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <div className="ml-4 flex items-center">
              <img 
                src="/lovable-uploads/0d410959-7adc-4358-8d98-ee41985c8c82.png" 
                alt="TreexPay" 
                className="h-8 w-8 mr-2"
              />
              <div className="text-xl font-bold text-primary">TreexPay</div>
            </div>
            <div className="ml-auto">
              <Header />
            </div>
          </header>
        ) : (
          <Header />
        )}
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
