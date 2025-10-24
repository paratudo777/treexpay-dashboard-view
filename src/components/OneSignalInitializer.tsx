
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
    if (!user) return;

    window.OneSignal = window.OneSignal || [];
    const OneSignal = window.OneSignal;

    OneSignal.push(() => {
      OneSignal.init({
        appId: ONE_SIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });

      // Use a API correta do OneSignal v16
      OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
        const playerId = event.current?.id;
        if (playerId) {
          console.log('OneSignal Player ID:', playerId);
          
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('onesignal_player_id')
              .eq('id', user.id)
              .single();

            if (profile && profile.onesignal_player_id !== playerId) {
              const { error } = await supabase
                .from('profiles')
                .update({ onesignal_player_id: playerId })
                .eq('id', user.id);
              
              if (error) {
                console.error('Error updating OneSignal Player ID:', error);
              } else {
                console.log('OneSignal Player ID updated successfully.');
              }
            }
          } catch (error) {
            console.error('Error handling OneSignal:', error);
          }
        }
      });
    });

  }, [user]);

  return null;
};

export default OneSignalInitializer;
