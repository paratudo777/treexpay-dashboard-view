
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  console.log('ProtectedRoute: Verificando acesso', { loading, isAuthenticated });

  useEffect(() => {
    // Se não está loading e não está autenticado, deve redirecionar
    if (!loading && !isAuthenticated) {
      console.log('ProtectedRoute: Usuário não autenticado, preparando redirecionamento');
      setShouldRedirect(true);
    } else if (isAuthenticated) {
      setShouldRedirect(false);
    }
  }, [loading, isAuthenticated]);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
          <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se deve redirecionar ou não está autenticado, vai para login
  if (shouldRedirect || !isAuthenticated) {
    console.log('ProtectedRoute: Redirecionando para login');
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: Acesso liberado');
  return <>{children}</>;
};

export default ProtectedRoute;
