
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user, profileError } = useAuth();

  console.log('AdminRoute: Verificando acesso', { 
    loading, 
    isAuthenticated, 
    isAdmin, 
    hasUser: !!user,
    profileError,
    userProfile: user?.profile 
  });

  // Mostrar loading enquanto carrega
  if (loading) {
    console.log('AdminRoute: Carregando autenticação...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  // Se há erro no perfil, mostrar mensagem de erro sem redirecionar
  if (profileError) {
    console.log('AdminRoute: Erro no perfil, bloqueando acesso:', profileError);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Erro ao carregar perfil</h2>
          <p className="text-gray-400 mb-4">{profileError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-treexpay-medium text-white rounded hover:bg-treexpay-medium/80"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Verificar se está autenticado
  if (!isAuthenticated || !user) {
    console.log('AdminRoute: Usuário não autenticado, redirecionando para login');
    return <Navigate to="/" replace />;
  }

  // Verificar se é admin
  if (!isAdmin) {
    console.log('AdminRoute: Usuário não é admin, redirecionando para dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Se chegou até aqui, é admin autenticado
  console.log('AdminRoute: Acesso liberado para admin:', user.email);
  return <>{children}</>;
};

export default AdminRoute;
