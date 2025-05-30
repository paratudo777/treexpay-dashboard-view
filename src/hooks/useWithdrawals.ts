
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
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUserWithdrawals = async () => {
    if (!user) {
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

      // Type assertion to ensure status matches our union type
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'requested' | 'processed' | 'rejected'
      }));

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
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all withdrawals:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar solicitações de saque.",
        });
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
    if (!user) return false;

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
