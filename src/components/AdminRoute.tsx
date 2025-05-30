
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  console.log('AdminRoute - Auth state:', { loading, isAuthenticated, isAdmin });

  // Aguardar carregamento da autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  // Verificar se está autenticado
  if (!isAuthenticated) {
    console.log('AdminRoute - User not authenticated, redirecting to login');
    return <Navigate to="/" replace />;
  }

  // Verificar se é admin
  if (!isAdmin) {
    console.log('AdminRoute - User not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AdminRoute - Access granted for admin');
  return <>{children}</>;
};

export default AdminRoute;
