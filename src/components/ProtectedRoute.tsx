
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [showTimeout, setShowTimeout] = useState(false);

  console.log('ProtectedRoute - Auth state:', { 
    loading, 
    isAuthenticated, 
    currentPath: location.pathname 
  });

  // Timeout de segurança para evitar loading infinito
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('ProtectedRoute - Loading timeout reached');
        setShowTimeout(true);
      }
    }, 10000); // 10 segundos

    return () => clearTimeout(timer);
  }, [loading]);

  // Se o timeout foi atingido, redirecionar para login
  if (showTimeout) {
    console.log('ProtectedRoute - Timeout reached, redirecting to login');
    return <Navigate to="/" replace />;
  }

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    console.log('ProtectedRoute - Still loading authentication...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando autenticação...</p>
        </div>
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
