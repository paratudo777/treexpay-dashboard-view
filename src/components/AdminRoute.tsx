
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  console.log('AdminRoute: Verificando acesso admin', { loading, isAuthenticated, isAdmin });

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  // Verificar se está autenticado
  if (!isAuthenticated) {
    console.log('AdminRoute: Usuário não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  // Verificar se é admin
  if (!isAdmin) {
    console.log('AdminRoute: Usuário não é admin, redirecionando para dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AdminRoute: Acesso liberado para admin');
  return <>{children}</>;
};

export default AdminRoute;
