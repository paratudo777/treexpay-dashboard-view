
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useUserBalance = () => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const fetchBalance = async () => {
    if (!user || !isAuthenticated) {
      console.log('useUserBalance: Usuário não autenticado, aguardando...');
      setLoading(true);
      setBalance(0);
      return;
    }

    try {
      setLoading(true);
      console.log('useUserBalance: Buscando saldo para usuário:', user.id);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('useUserBalance: Erro ao buscar saldo:', profileError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar saldo.",
        });
        setBalance(0);
        return;
      }

      const validatedBalance = Number(profileData.balance) || 0;
      console.log('useUserBalance: Saldo carregado:', validatedBalance);
      
      if (validatedBalance < 0) {
        console.warn('useUserBalance: Saldo negativo detectado, definindo como 0');
        setBalance(0);
      } else {
        setBalance(validatedBalance);
      }
    } catch (error) {
      console.error('useUserBalance: Erro na busca do saldo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useUserBalance: Efeito executado, user:', user?.id, 'isAuthenticated:', isAuthenticated);
    
    // Aguardar até ter usuário autenticado para buscar dados
    if (isAuthenticated && user) {
      fetchBalance();
    } else {
      console.log('useUserBalance: Aguardando autenticação completa...');
      setLoading(true);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!user || !isAuthenticated) return;

    console.log('useUserBalance: Configurando listener real-time para saldo');
    
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
          console.log('useUserBalance: Mudança no saldo detectada:', payload);
          const newRecord = payload.new as any;
          if (newRecord && newRecord.id === user.id) {
            const validatedBalance = Number(newRecord.balance) || 0;
            setBalance(validatedBalance >= 0 ? validatedBalance : 0);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('useUserBalance: Removendo listener real-time');
      supabase.removeChannel(channel);
    };
  }, [user, isAuthenticated]);

  return {
    balance,
    loading,
    refetch: fetchBalance
  };
};
