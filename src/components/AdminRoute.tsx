
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Aguardar que a verificação de autenticação seja concluída
  useEffect(() => {
    if (!loading) {
      // Pequeno delay para garantir que o estado esteja estável
      const timer = setTimeout(() => {
        setAuthCheckComplete(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Mostrar loading enquanto verifica autenticação
  if (loading || !authCheckComplete) {
    console.log('AdminRoute: Aguardando verificação de autenticação...', { loading, authCheckComplete, user: !!user, isAdmin });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  // Verificar se está autenticado
  if (!isAuthenticated || !user) {
    console.log('AdminRoute: Usuário não autenticado, redirecionando para login', { isAuthenticated, user: !!user });
    return <Navigate to="/" replace />;
  }

  // Verificar se é admin
  if (!isAdmin) {
    console.log('AdminRoute: Usuário não é admin, redirecionando para dashboard', { isAdmin, userProfile: user?.profile });
    return <Navigate to="/dashboard" replace />;
  }

  // Se chegou até aqui, é admin autenticado
  console.log('AdminRoute: Usuário admin autenticado, permitindo acesso', { user: user.email, profile: user.profile });
  return <>{children}</>;
};

export default AdminRoute;
