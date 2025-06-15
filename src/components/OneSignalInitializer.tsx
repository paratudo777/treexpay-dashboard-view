
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignal: any;
  }
}

const OneSignalInitializer = () => {
  const { user } = useAuth();
  const ONE_SIGNAL_APP_ID = 'c9f3c4e6-590c-4036-84de-aa327ea3c246';

  useEffect(() => {
    if (!user) {
      console.log('OneSignal: Usuário não logado, adiando inicialização.');
      return;
    }

    console.log('OneSignal: Inicializando para o usuário:', user.id);
    window.OneSignal = window.OneSignal || [];
    const OneSignal = window.OneSignal;

    OneSignal.push(() => {
      console.log('OneSignal: Executando OneSignal.push');
      OneSignal.init({
        appId: ONE_SIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });

      console.log('OneSignal: Tentando obter o Player ID...');
      OneSignal.getUserId(async (playerId: string | null | undefined) => {
        if (playerId) {
          console.log('OneSignal: Player ID obtido com sucesso:', playerId);
          
          console.log('OneSignal: Buscando perfil no Supabase para o usuário:', user.id);
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('onesignal_player_id')
            .eq('id', user.id)
            .single();

          if (fetchError) {
            console.error('OneSignal: Erro ao buscar perfil:', fetchError);
            return;
          }

          if (profile) {
            console.log('OneSignal: Perfil encontrado. Player ID atual no DB:', profile.onesignal_player_id);
            if (profile.onesignal_player_id !== playerId) {
              console.log('OneSignal: Player ID diferente, atualizando no DB...');
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ onesignal_player_id: playerId })
                .eq('id', user.id);
              if (updateError) {
                console.error('OneSignal: Erro ao atualizar o Player ID:', updateError);
              } else {
                console.log('OneSignal: Player ID atualizado com sucesso no DB.');
              }
            } else {
              console.log('OneSignal: Player ID já está atualizado no DB.');
            }
          } else {
            console.warn('OneSignal: Perfil não encontrado para o usuário. Não foi possível salvar o Player ID.');
          }
        } else {
          console.log('OneSignal: Não foi possível obter o Player ID. O usuário pode ter bloqueado as notificações.');
        }
      });
    });

  }, [user]);

  return null;
};

export default OneSignalInitializer;
