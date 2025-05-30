
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const [stabilityCheck, setStabilityCheck] = useState(false);
  const [authStateStable, setAuthStateStable] = useState(false);

  // Aguardar estabilidade da autenticação
  useEffect(() => {
    const timer = setTimeout(() => {
      setStabilityCheck(true);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  // Verificar se o estado de autenticação está estável
  useEffect(() => {
    if (user && isAuthenticated && (isAdmin !== undefined)) {
      const stabilityTimer = setTimeout(() => {
        setAuthStateStable(true);
      }, 100);

      return () => clearTimeout(stabilityTimer);
    } else if (!loading && !user) {
      // Se não está carregando e não tem usuário, pode definir como estável para permitir redirect
      setAuthStateStable(true);
    }
  }, [user, isAuthenticated, isAdmin, loading]);

  // Aguardar carregamento completo E estabilidade
  if (loading || !stabilityCheck || !authStateStable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  // Verificação final: só redireciona se realmente não está autenticado
  if (!isAuthenticated || !user) {
    console.log('AdminRoute: Usuário não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  // Verificação de admin: só redireciona se confirmadamente não é admin
  if (isAuthenticated && user && !isAdmin) {
    console.log('AdminRoute: Usuário autenticado mas não é admin, redirecionando para dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Se chegou até aqui, é admin autenticado
  console.log('AdminRoute: Usuário admin autenticado, permitindo acesso');
  return <>{children}</>;
};

export default AdminRoute;
