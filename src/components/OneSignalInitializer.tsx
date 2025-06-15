
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Permite que o TypeScript reconheça as variáveis do OneSignal no objeto window
declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any;
  }
}

const OneSignalInitializer = () => {
  const { user } = useAuth();

  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      if (!OneSignal.isInitialized()) {
        await OneSignal.init({
          appId: 'c9f3c4e6-590c-4036-84de-aa327ea3c246',
          notifyButton: {
            enable: true, // Ativa o botão flutuante de notificação
          },
          allowLocalhostAsSecureOrigin: true, // Facilita o teste local
        });
      }

      // Aguarda o usuário ser carregado pelo AuthContext
      if (user) {
        // Verifica se o usuário já está identificado no OneSignal
        const externalUserId = await OneSignal.User.getExternalId();
        if (externalUserId !== user.id) {
          console.log(`OneSignal: Identificando usuário ${user.id}`);
          await OneSignal.login(user.id);
        }
      } else {
        // Se não houver usuário, verifica se precisamos fazer logout do OneSignal
        const externalUserId = await OneSignal.User.getExternalId();
        if (externalUserId) {
          console.log('OneSignal: Fazendo logout do usuário.');
          await OneSignal.logout();
        }
      }
    });
  }, [user]);

  return null; // Este componente não renderiza nada na tela
};

export default OneSignalInitializer;
