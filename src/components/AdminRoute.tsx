
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [stabilityCheck, setStabilityCheck] = useState(false);

  // Aguardar um momento para estabilidade antes de permitir redirecionamentos
  useEffect(() => {
    const timer = setTimeout(() => {
      setStabilityCheck(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Aguardar o carregamento da autenticação E estabilidade
  if (loading || !stabilityCheck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  // Verificações mais defensivas - só redireciona se realmente não está autenticado
  if (!isAuthenticated) {
    console.log('AdminRoute: Usuário não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  // Verificação adicional para admin - só redireciona se tiver certeza que não é admin
  if (isAuthenticated && !isAdmin) {
    console.log('AdminRoute: Usuário autenticado mas não é admin, redirecionando para dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Se chegou até aqui, é admin autenticado
  return <>{children}</>;
};

export default AdminRoute;
