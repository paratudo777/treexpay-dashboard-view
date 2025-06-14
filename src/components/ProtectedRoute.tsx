
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [maxWaitReached, setMaxWaitReached] = useState(false);

  console.log('ProtectedRoute: Verificando acesso', { loading, isAuthenticated });

  // Timeout de segurança para evitar loading infinito
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('ProtectedRoute: Timeout atingido, forçando saída do loading');
        setMaxWaitReached(true);
      }
    }, 8000); // 8 segundos máximo

    return () => clearTimeout(timeout);
  }, [loading]);

  // Mostrar loading enquanto verifica autenticação (com timeout)
  if (loading && !maxWaitReached) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Usuário não autenticado, redirecionando');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
