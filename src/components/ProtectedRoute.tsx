
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - Auth state:', { 
    loading, 
    isAuthenticated, 
    currentPath: location.pathname 
  });

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    console.log('ProtectedRoute - Still loading authentication...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  // Só redirecionar se definitivamente não estiver autenticado
  if (!isAuthenticated) {
    console.log('ProtectedRoute - User not authenticated, redirecting to login');
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute - Access granted to protected route');
  return <>{children}</>;
};

export default ProtectedRoute;
