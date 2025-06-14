
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  pix_key_type: string;
  pix_key: string;
  status: 'requested' | 'processed' | 'rejected';
  request_date: string;
  created_at: string;
  // Dados do usuário vindos do join
  user_name?: string;
  user_email?: string;
}

export const useWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const fetchWithdrawals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Buscando saques para usuário:', user.id, 'isAdmin:', isAdmin);
      
      let query = supabase
        .from('withdrawals')
        .select(`
          id,
          user_id,
          amount,
          pix_key_type,
          pix_key,
          status,
          request_date,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Se não for admin, buscar apenas os saques do usuário atual
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar saques:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar saques.",
        });
        return;
      }

      console.log('📊 Saques encontrados:', data?.length || 0);
      
      // Se for admin, buscar dados dos usuários para cada saque
      if (isAdmin && data && data.length > 0) {
        const userIds = [...new Set(data.map(w => w.user_id))];
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);

        if (!profilesError && profiles) {
          const withdrawalsWithUserData = data.map(withdrawal => {
            const userProfile = profiles.find(p => p.id === withdrawal.user_id);
            return {
              ...withdrawal,
              status: withdrawal.status as 'requested' | 'processed' | 'rejected',
              user_name: userProfile?.name || 'Nome não encontrado',
              user_email: userProfile?.email || 'Email não encontrado'
            };
          });
          setWithdrawals(withdrawalsWithUserData);
        } else {
          const typedWithdrawals = data.map(w => ({
            ...w,
            status: w.status as 'requested' | 'processed' | 'rejected'
          }));
          setWithdrawals(typedWithdrawals);
        }
      } else {
        const typedWithdrawals = (data || []).map(w => ({
          ...w,
          status: w.status as 'requested' | 'processed' | 'rejected'
        }));
        setWithdrawals(typedWithdrawals);
      }
    } catch (error) {
      console.error('❌ Erro em fetchWithdrawals:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (withdrawalId: string) => {
    try {
      console.log('✅ Aprovando saque:', withdrawalId);
      
      const { data, error } = await supabase.rpc('aprovar_saque', {
        saque_id: withdrawalId,
        valor: withdrawals.find(w => w.id === withdrawalId)?.amount || 0
      });

      if (error) {
        console.error('❌ Erro ao aprovar saque:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao aprovar saque.",
        });
        return false;
      }

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message || "Saque aprovado com sucesso!",
        });
        await fetchWithdrawals(); // Recarregar lista
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Erro ao aprovar saque.",
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Erro em approveWithdrawal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno.",
      });
      return false;
    }
  };

  const rejectWithdrawal = async (withdrawalId: string) => {
    try {
      console.log('❌ Rejeitando saque:', withdrawalId);
      
      const { data, error } = await supabase.rpc('rejeitar_saque', {
        saque_id: withdrawalId
      });

      if (error) {
        console.error('❌ Erro ao rejeitar saque:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao rejeitar saque.",
        });
        return false;
      }

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message || "Saque rejeitado com sucesso!",
        });
        await fetchWithdrawals(); // Recarregar lista
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Erro ao rejeitar saque.",
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Erro em rejectWithdrawal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno.",
      });
      return false;
    }
  };

  const getTodaysWithdrawals = () => {
    const today = new Date().toDateString();
    return withdrawals.filter(w => new Date(w.created_at).toDateString() === today);
  };

  const getWithdrawalsByStatus = (status: string) => {
    return withdrawals.filter(w => w.status === status);
  };

  useEffect(() => {
    console.log('🔄 useWithdrawals: Efeito executado');
    fetchWithdrawals();
  }, [user, isAdmin]);

  // Set up real-time listening
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Configurando listener real-time para saques...');
    
    const channel = supabase
      .channel('withdrawals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawals',
        },
        (payload) => {
          console.log('📡 Mudança em saque detectada:', payload);
          fetchWithdrawals(); // Recarregar quando houver mudanças
        }
      )
      .subscribe();

    return () => {
      console.log('🛑 Desconectando listener real-time...');
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  return {
    withdrawals,
    loading,
    fetchWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    getTodaysWithdrawals,
    getWithdrawalsByStatus,
    refetch: fetchWithdrawals
  };
};
