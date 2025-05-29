
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RouterFallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle direct access to routes on custom domains
    const handleRouteRefresh = () => {
      const currentPath = location.pathname;
      
      // List of valid routes in your application
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

      // If current path is not in valid routes and not root, redirect to login
      if (!validRoutes.includes(currentPath) && currentPath !== '/') {
        console.log('Invalid route detected, redirecting to login:', currentPath);
        navigate('/', { replace: true });
      }
    };

    handleRouteRefresh();
  }, [location, navigate]);

  return null;
};

export default RouterFallback;
