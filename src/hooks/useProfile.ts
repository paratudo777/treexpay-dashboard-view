
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
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }
      console.log('Profile data:', data);
      return data;
    },
    enabled: !!user?.id,
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
        .single();

      if (error) {
        console.error('Settings fetch error:', error);
        throw error;
      }
      console.log('Settings data:', data);
      return data;
    },
    enabled: !!user?.id,
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
        throw error;
      }
      console.log('Notifications data:', data);
      return data;
    },
    enabled: !!user?.id,
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
    updateNotifications: updateNotificationsMutation.mutate,
    markNotificationAsRead: markNotificationAsReadMutation.mutate,
  };
};
