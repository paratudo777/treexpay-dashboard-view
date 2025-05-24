
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  name: string;
  email: string;
  profile: 'admin' | 'user';
  active: boolean;
  balance: number;
  notifications_enabled: boolean;
  two_fa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Settings {
  id: string;
  user_id: string;
  deposit_fee: number;
  withdrawal_fee: number;
  created_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: 'sale_pending' | 'sale_approved' | 'login' | 'password_change';
  content: string;
  read: boolean;
  sent_date: string;
}

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
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      
      console.log('Profile data:', data);
      return data as Profile;
    },
    enabled: !!user?.id,
    retry: 1,
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
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }
      
      console.log('Settings data:', data);
      return data as Settings;
    },
    enabled: !!user?.id,
    retry: 1,
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
        .order('sent_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
      
      console.log('Notifications data:', data);
      return data as Notification[];
    },
    enabled: !!user?.id,
    retry: 1,
  });

  // Update notifications preference
  const updateNotificationsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      console.log('Updating notifications preference to:', enabled);
      
      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: enabled })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error updating notifications:', error);
        throw error;
      }
      
      return enabled;
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
      console.log('Marking notification as read:', notificationId);
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
      
      return notificationId;
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
