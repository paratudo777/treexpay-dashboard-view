
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNetBalance } from './useNetBalance';

export const useUserBalance = () => {
  const [balance, setBalance] = useState<number>(0);
  const [depositCount, setDepositCount] = useState<number>(0);
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
      
      // Buscar saldo bruto
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

      // Buscar quantidade de depósitos aprovados
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (depositsError) {
        console.error('Error fetching deposits count:', depositsError);
      }

      console.log('Updated balance fetched:', profileData.balance);
      setBalance(Number(profileData.balance) || 0);
      setDepositCount(depositsData?.length || 0);
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

  // Calcular saldo líquido
  const netBalanceData = useNetBalance(user?.id || '', balance, depositCount);

  useEffect(() => {
    fetchBalance();
  }, [user]);

  // Set up real-time subscription for balance changes
  useEffect(() => {
    if (!user) return;

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
          console.log('Balance updated via real-time:', payload.new.balance);
          setBalance(Number(payload.new.balance) || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    balance: netBalanceData.netBalance, // Retorna saldo líquido
    grossBalance: balance, // Saldo bruto disponível se necessário
    balanceDetails: netBalanceData,
    loading,
    refetch: fetchBalance
  };
};
