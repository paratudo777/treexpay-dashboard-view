
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  console.log('ProtectedRoute: Verificando acesso', { loading, isAuthenticated });

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

  // Se não está autenticado, redirecionar para login
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Usuário não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: Acesso liberado');
  return <>{children}</>;
};

export default ProtectedRoute;
