
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
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const fetchUserWithdrawals = async () => {
    if (!user || !isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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

      // Type assertion para garantir que o status seja do tipo correto
      const typedWithdrawals = data?.map(item => ({
        ...item,
        status: item.status as 'requested' | 'processed' | 'rejected'
      })) || [];

      setWithdrawals(typedWithdrawals);
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
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles!inner(name, email)
        `)
        .eq('status', 'requested')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending withdrawals:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar solicitações de saque.",
        });
        return;
      }

      // Type assertion e formatação dos dados
      const formattedData = data?.map(item => ({
        ...item,
        status: item.status as 'requested' | 'processed' | 'rejected',
        user: {
          name: item.profiles.name,
          email: item.profiles.email
        }
      })) || [];

      setWithdrawals(formattedData);
    } catch (error) {
      console.error('Error in fetchPendingWithdrawals:', error);
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
    if (!user || !isAuthenticated) return false;

    try {
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
    if (isAuthenticated && user) {
      fetchUserWithdrawals();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!user || !isAuthenticated) return;

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
          fetchUserWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAuthenticated]);

  return {
    withdrawals,
    loading,
    fetchUserWithdrawals,
    fetchPendingWithdrawals,
    createWithdrawalRequest,
    refetch: fetchUserWithdrawals
  };
};
