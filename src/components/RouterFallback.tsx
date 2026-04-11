
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RouterFallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Limpar timeout anterior se existir
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    const currentPath = location.pathname;
    
    console.log('RouterFallback: Verificando rota:', currentPath);
    
    // Lista de rotas válidas
    const validRoutes = [
      '/',
      '/dashboard',
      '/transactions',
      '/depositos',
      '/checkouts',
      '/financeiro',
      '/ranking',
      '/api',
      '/perfil',
      '/admin',
      '/admin/usuarios',
      '/admin/transacoes',
      '/admin/criar-usuario',
      '/admin/saques'
    ];

    // Verificar se é uma rota de checkout público
    const isCheckoutRoute = /^\/checkout\/[a-zA-Z0-9]+$/.test(currentPath);
    
    // Verificar se a rota é válida
    const isValidRoute = validRoutes.includes(currentPath) || isCheckoutRoute;

    console.log('RouterFallback: status da rota', {
      currentPath,
      isValidRoute,
      isCheckoutRoute,
    });
    
    // Se a rota não é válida, redirecionar após um delay
    if (!isValidRoute && currentPath !== '/') {
      console.log('RouterFallback: Rota inválida, redirecionando:', currentPath);
      
      navigationTimeoutRef.current = setTimeout(() => {
        try {
          navigate('/', { replace: true });
        } catch (error) {
          console.error('RouterFallback: Erro na navegação:', error);
        }
      }, 100);
    } else {
      console.log('RouterFallback: rota permitida, sem redirect:', currentPath);
    }

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [location.pathname, navigate]);

  return null;
};

export default RouterFallback;
