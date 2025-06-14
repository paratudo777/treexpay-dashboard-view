
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  console.log('ProtectedRoute: Verificando acesso', { loading, isAuthenticated });

  // Se não está autenticado e não está carregando, redirecionar
  if (!loading && !isAuthenticated) {
    console.log('ProtectedRoute: Não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  // Mostrar loading apenas se ainda está carregando
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

  console.log('ProtectedRoute: Acesso liberado');
  return <>{children}</>;
};

export default ProtectedRoute;
