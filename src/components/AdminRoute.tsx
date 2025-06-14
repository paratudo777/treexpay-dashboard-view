
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [maxWaitReached, setMaxWaitReached] = useState(false);

  console.log('AdminRoute: Verificando acesso admin', { loading, isAuthenticated, isAdmin });

  // Timeout de segurança
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('AdminRoute: Timeout atingido, forçando saída do loading');
        setMaxWaitReached(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  // Mostrar loading enquanto carrega
  if (loading && !maxWaitReached) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
          <p className="text-sm text-muted-foreground">Verificando permissões de admin...</p>
        </div>
      </div>
    );
  }

  // Se não autenticado ou timeout atingido, redirecionar para login
  if (!isAuthenticated || maxWaitReached) {
    console.log('AdminRoute: Usuário não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  // Se autenticado mas não é admin, redirecionar para dashboard
  if (!isAdmin) {
    console.log('AdminRoute: Usuário não é admin, redirecionando para dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AdminRoute: Acesso liberado para admin');
  return <>{children}</>;
};

export default AdminRoute;
