
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

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
  type: 'deposit' | 'withdrawal' | 'transaction';
  content: string;
  read: boolean;
  sent_date: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  console.log('useProfile hook - user:', user);

  // Mock profile data
  const mockProfile: Profile = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    active: user.status === 'active',
    balance: user.balance,
    notifications_enabled: true,
    two_fa_enabled: false,
    created_at: user.createdAt,
    updated_at: new Date().toISOString(),
  } : null;

  // Mock settings data
  const mockSettings: Settings = user ? {
    id: 'mock-settings-id',
    user_id: user.id,
    deposit_fee: 2.50,
    withdrawal_fee: 1.50,
    created_at: user.createdAt,
  } : null;

  // Mock notifications data
  const mockNotifications: Notification[] = user ? [
    {
      id: 'mock-notification-1',
      user_id: user.id,
      type: 'deposit',
      content: 'Depósito de R$ 100,00 processado com sucesso',
      read: false,
      sent_date: new Date().toISOString(),
    },
    {
      id: 'mock-notification-2',
      user_id: user.id,
      type: 'transaction',
      content: 'Nova transação realizada',
      read: true,
      sent_date: new Date(Date.now() - 86400000).toISOString(),
    }
  ] : [];

  // Get user profile data (mock)
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      console.log('Fetching mock profile for user:', user?.id);
      if (!user?.id) {
        console.log('No user ID available, returning null');
        return null;
      }
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Mock profile data:', mockProfile);
      return mockProfile;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  // Get user settings (mock)
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      console.log('Fetching mock settings for user:', user?.id);
      if (!user?.id) return null;
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('Mock settings data:', mockSettings);
      return mockSettings;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  // Get user notifications (mock)
  const { data: notifications, isLoading: notificationsLoading, error: notificationsError } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      console.log('Fetching mock notifications for user:', user?.id);
      if (!user?.id) return [];
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      console.log('Mock notifications data:', mockNotifications);
      return mockNotifications;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  // Update notifications preference (mock)
  const updateNotificationsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      console.log('Mock updating notifications preference to:', enabled);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real implementation, this would update the database
      return enabled;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({
        title: enabled ? "Notificações ativadas" : "Notificações desativadas",
        description: enabled 
          ? "Você receberá notificações sobre suas vendas. (Mock)" 
          : "Você não receberá notificações sobre suas vendas. (Mock)",
      });
    },
    onError: (error) => {
      console.error('Mock update notifications error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar configurações",
        description: "Tente novamente mais tarde. (Mock)",
      });
    },
  });

  // Mark notification as read (mock)
  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      console.log('Mock marking notification as read:', notificationId);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (error) => {
      console.error('Mock mark notification as read error:', error);
    },
  });

  console.log('useProfile hook results (mock):', {
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
