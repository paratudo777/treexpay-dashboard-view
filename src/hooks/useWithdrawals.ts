
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  pix_key_type: string;
  status: 'requested' | 'processed' | 'rejected';
  request_date: string;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
}

export const useWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchUserWithdrawals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('useWithdrawals - Fetching user withdrawals for:', user.id);
      
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching withdrawals:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar histórico de saques.",
        });
        return;
      }

      // Type assertion to ensure status matches our union type
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'requested' | 'processed' | 'rejected'
      }));

      console.log('useWithdrawals - User withdrawals loaded:', typedData.length);
      setWithdrawals(typedData);
    } catch (error) {
      console.error('Error in fetchUserWithdrawals:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingWithdrawals = async () => {
    if (!user) {
      console.log('useWithdrawals - No user found, skipping fetch');
      setLoading(false);
      return;
    }

    if (!isAdmin) {
      console.log('useWithdrawals - User is not admin, cannot fetch all withdrawals');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('useWithdrawals - Fetching all withdrawals for admin:', user.id);
      
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all withdrawals:', error);
        
        // Don't show error toast for permission issues, just log
        if (error.code === 'PGRST301' || error.message.includes('permission')) {
          console.log('useWithdrawals - Permission denied, user may not be admin');
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Erro ao carregar solicitações de saque.",
          });
        }
        setWithdrawals([]);
        return;
      }

      // Type assertion and data transformation
      const formattedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'requested' | 'processed' | 'rejected',
        user: {
          name: item.profiles.name,
          email: item.profiles.email
        }
      }));

      console.log('useWithdrawals - All withdrawals loaded:', formattedData.length);
      setWithdrawals(formattedData);
    } catch (error) {
      console.error('Error in fetchPendingWithdrawals:', error);
      
      // Don't redirect to login for fetch errors
      setWithdrawals([]);
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWithdrawalRequest = async (amount: number, pixKey: string, pixKeyType: string) => {
    if (!user) return false;

    try {
      console.log('useWithdrawals - Creating withdrawal request for user:', user.id);
      
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          status: 'requested'
        });

      if (error) {
        console.error('Error creating withdrawal request:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao criar solicitação de saque.",
        });
        return false;
      }

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de saque será analisada em breve.",
      });

      fetchUserWithdrawals();
      return true;
    } catch (error) {
      console.error('Error in createWithdrawalRequest:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserWithdrawals();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('withdrawals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('useWithdrawals - Real-time update received');
          fetchUserWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    withdrawals,
    loading,
    fetchUserWithdrawals,
    fetchPendingWithdrawals,
    createWithdrawalRequest,
    refetch: fetchUserWithdrawals
  };
};
