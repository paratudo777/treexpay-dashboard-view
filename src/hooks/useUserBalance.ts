
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useUserBalance = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBalance = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Enhanced security: Explicit user validation and data fetching
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching balance:', profileError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar saldo.",
        });
        return;
      }

      // Additional validation to ensure balance is a valid number
      const validatedBalance = Number(profileData.balance) || 0;
      if (validatedBalance < 0) {
        console.warn('Negative balance detected, setting to 0');
        setBalance(0);
      } else {
        setBalance(validatedBalance);
      }
    } catch (error) {
      console.error('Error in fetchBalance:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Enhanced real-time subscription with additional validation
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
  }, [user]);

  return {
    balance,
    loading,
    refetch: fetchBalance
  };
};
