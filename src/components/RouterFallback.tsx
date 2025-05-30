
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RouterFallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    // Evitar múltiplas navegações simultâneas
    if (isNavigatingRef.current) return;

    const handleRouteRefresh = () => {
      const currentPath = location.pathname;
      
      console.log('RouterFallback: Verificando rota:', currentPath);
      
      // Lista de rotas válidas da aplicação
      const validRoutes = [
        '/',
        '/dashboard',
        '/transactions',
        '/depositos',
        '/checkouts',
        '/financeiro',
        '/ranking',
        '/perfil',
        '/admin',
        '/admin/saques'  // Adicionada a rota de solicitações de saque
      ];

      // Verificar se é uma rota de checkout público
      const isCheckoutRoute = /^\/checkout\/[a-zA-Z0-9]+$/.test(currentPath);
      
      // Verificar se é uma rota admin (pattern matching)
      const isAdminRoute = /^\/admin(\/.*)?$/.test(currentPath);

      // Verificar se a rota é válida
      const isValidRoute = validRoutes.includes(currentPath) || isCheckoutRoute || isAdminRoute;
      
      console.log('RouterFallback: Análise da rota', { 
        currentPath, 
        isValidRoute, 
        isCheckoutRoute, 
        isAdminRoute 
      });
      
      // Se a rota não é válida e não é a root, redirecionar
      if (!isValidRoute && currentPath !== '/') {
        console.log('RouterFallback: Rota inválida detectada, redirecionando para login:', currentPath);
        
        isNavigatingRef.current = true;
        
        // Usar setTimeout para evitar conflitos de navegação
        setTimeout(() => {
          try {
            navigate('/', { replace: true });
          } catch (error) {
            console.error('RouterFallback: Erro na navegação:', error);
          } finally {
            isNavigatingRef.current = false;
          }
        }, 0);
      } else {
        console.log('RouterFallback: Rota válida, não redirecionando');
      }
    };

    // Executar verificação apenas após um pequeno delay
    const timeoutId = setTimeout(handleRouteRefresh, 50);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.pathname, navigate]);

  // Reset do flag quando a localização muda
  useEffect(() => {
    isNavigatingRef.current = false;
  }, [location.pathname]);

  return null;
};

export default RouterFallback;
