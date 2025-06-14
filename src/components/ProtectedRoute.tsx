
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  console.log('ProtectedRoute: Verificando acesso', { loading, isAuthenticated });

  // Timeout de segurança para evitar loading infinito
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('ProtectedRoute: Timeout de loading atingido');
      setTimeoutReached(true);
    }, 5000); // 5 segundos

    return () => clearTimeout(timer);
  }, []);

  // Se o loading durar mais que 5 segundos OU se não está autenticado, redirecionar
  if (timeoutReached || (!loading && !isAuthenticated)) {
    console.log('ProtectedRoute: Redirecionando para login', { timeoutReached, loading, isAuthenticated });
    return <Navigate to="/" replace />;
  }

  // Mostrar loading apenas se ainda está carregando e não atingiu timeout
  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  console.log('ProtectedRoute: Acesso liberado');
  return <>{children}</>;
};

export default ProtectedRoute;
