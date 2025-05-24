import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Settings = Database['public']['Tables']['settings']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('useProfile hook - user:', user);

  // Get user profile data
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      console.log('Fetching profile for user:', user?.id);
      if (!user?.id) {
        console.log('No user ID available, returning null');
        return null;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Using maybeSingle instead of single

      if (error) {
        console.error('Profile fetch error:', error);
        // Check if it's an RLS error or missing profile
        if (error.code === 'PGRST116') {
          console.error('Profile not found for user:', user.id);
          toast({
            variant: "destructive",
            title: "Perfil não encontrado",
            description: "Seu perfil não foi encontrado. Entre em contato com o suporte.",
          });
        } else {
          console.error('RLS or permission error:', error);
          toast({
            variant: "destructive",
            title: "Erro ao carregar perfil",
            description: "Não foi possível carregar suas informações. Tente fazer login novamente.",
          });
        }
        throw error;
      }
      
      if (!data) {
        console.log('No profile data found for user:', user.id);
        return null;
      }
      
      console.log('Profile data:', data);
      return data;
    },
    enabled: !!user?.id,
    retry: (failureCount, error: any) => {
      // Don't retry on RLS errors or missing profile
      if (error?.code === 'PGRST116' || error?.code === '42501') {
        return false;
      }
      return failureCount < 1; // Reduced retry count
    },
  });

  // Get user settings
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      console.log('Fetching settings for user:', user?.id);
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Using maybeSingle instead of single

      if (error) {
        console.error('Settings fetch error:', error);
        // Settings might not exist yet, which is ok
        if (error.code === 'PGRST116') {
          console.log('Settings not found for user, this is ok');
          return null;
        }
        throw error;
      }
      console.log('Settings data:', data);
      return data;
    },
    enabled: !!user?.id,
    retry: (failureCount, error: any) => {
      if (error?.code === 'PGRST116') {
        return false;
      }
      return failureCount < 1; // Reduced retry count
    },
  });

  // Get user notifications
  const { data: notifications, isLoading: notificationsLoading, error: notificationsError } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      console.log('Fetching notifications for user:', user?.id);
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Notifications fetch error:', error);
        return [];
      }
      console.log('Notifications data:', data);
      return data || [];
    },
    enabled: !!user?.id,
    retry: 1, // Reduced retry count
  });

  // Update notifications preference
  const updateNotificationsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: enabled })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({
        title: enabled ? "Notificações ativadas" : "Notificações desativadas",
        description: enabled 
          ? "Você receberá notificações sobre suas vendas." 
          : "Você não receberá notificações sobre suas vendas.",
      });
    },
    onError: (error) => {
      console.error('Update notifications error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar configurações",
        description: "Tente novamente mais tarde.",
      });
    },
  });

  // Mark notification as read
  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (error) => {
      console.error('Mark notification as read error:', error);
    },
  });

  console.log('useProfile hook results:', {
    profile,
    settings,
    notifications,
    profileLoading,
    settingsLoading,
    notificationsLoading,
    profileError,
    settingsError,
    notificationsError
  });

  return {
    profile,
    settings,
    notifications,
    isLoading: profileLoading || settingsLoading || notificationsLoading,
    profileError,
    updateNotifications: updateNotificationsMutation.mutate,
    markNotificationAsRead: markNotificationAsReadMutation.mutate,
  };
};
