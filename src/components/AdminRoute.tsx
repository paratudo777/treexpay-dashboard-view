
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  console.log('AdminRoute: Verificando acesso admin', { loading, isAuthenticated, isAdmin });

  // Timeout de segurança para evitar loading infinito
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('AdminRoute: Timeout de loading atingido');
      setTimeoutReached(true);
    }, 5000); // 5 segundos

    return () => clearTimeout(timer);
  }, []);

  // Se atingiu timeout OU se não está autenticado, redirecionar para login
  if (timeoutReached || (!loading && !isAuthenticated)) {
    console.log('AdminRoute: Redirecionando para login', { timeoutReached, loading, isAuthenticated });
    return <Navigate to="/" replace />;
  }

  // Se está autenticado mas não é admin, redirecionar para dashboard
  if (!loading && isAuthenticated && !isAdmin) {
    console.log('AdminRoute: Usuário não é admin, redirecionando para dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Mostrar loading apenas se ainda está carregando e não atingiu timeout
  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
          <p className="text-sm text-muted-foreground">Verificando permissões de admin...</p>
        </div>
      </div>
    );
  }

  console.log('AdminRoute: Acesso liberado para admin');
  return <>{children}</>;
};

export default AdminRoute;
