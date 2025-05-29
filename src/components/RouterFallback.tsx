
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
      
      // Lista de rotas válidas da aplicação
      const validRoutes = [
        '/',
        '/dashboard',
        '/transactions',
        '/depositos',
        '/financeiro',
        '/ranking',
        '/perfil',
        '/admin'
      ];

      // Verificar se a rota é válida
      const isValidRoute = validRoutes.includes(currentPath);
      
      // Se a rota não é válida e não é a root, redirecionar
      if (!isValidRoute && currentPath !== '/') {
        console.log('Rota inválida detectada, redirecionando para login:', currentPath);
        
        isNavigatingRef.current = true;
        
        // Usar setTimeout para evitar conflitos de navegação
        setTimeout(() => {
          try {
            navigate('/', { replace: true });
          } catch (error) {
            console.error('Erro na navegação:', error);
          } finally {
            isNavigatingRef.current = false;
          }
        }, 0);
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
