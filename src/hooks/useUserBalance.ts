
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useUserBalance = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const fetchBalance = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setLoading(true);
      setBalance(0);
      return;
    }

    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (profileError) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar saldo.",
        });
        setBalance(0);
        return;
      }

      const validatedBalance = Number(profileData.balance) || 0;
      setBalance(validatedBalance >= 0 ? validatedBalance : 0);
    } catch {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, toast]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchBalance();
    } else {
      setLoading(true);
    }
  }, [user, isAuthenticated, fetchBalance]);

  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const channel = supabase
      .channel('profile-balance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord && newRecord.id === user.id) {
            const validatedBalance = Number(newRecord.balance) || 0;
            setBalance(validatedBalance >= 0 ? validatedBalance : 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAuthenticated]);

  return {
    balance,
    loading,
    refetch: fetchBalance
  };
};
