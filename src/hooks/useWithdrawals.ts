
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;  
  pix_key_type: string;
  status: 'requested' | 'processed' | 'rejected';
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export const useWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          id,
          user_id,
          amount,
          pix_key,
          pix_key_type,
          status,
          created_at,
          profiles!inner(email, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar saques:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar saques.",
        });
        return;
      }

      const formattedWithdrawals = (data || []).map(withdrawal => ({
        ...withdrawal,
        user_name: withdrawal.profiles?.name || 'Nome não encontrado',
        user_email: withdrawal.profiles?.email || 'Email não encontrado'
      }));

      setWithdrawals(formattedWithdrawals);
    } catch (error) {
      console.error('Erro em fetchWithdrawals:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (id: string): Promise<boolean> => {
    try {
      console.log('🔄 Aprovando saque:', id);
      
      const { data, error } = await supabase.rpc('approve_withdrawal', {
        withdrawal_id: id
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

      const result = data as { success: boolean; error?: string };
      if (result && !result.success) {
        console.error('❌ Falha na aprovação:', result.error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Erro ao aprovar saque.",
        });
        return false;
      }

      console.log('✅ Saque aprovado com sucesso');
      toast({
        title: "Sucesso",
        description: "Saque aprovado com sucesso!",
      });

      await fetchWithdrawals();
      return true;
    } catch (error) {
      console.error('❌ Erro em approveWithdrawal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      return false;
    }
  };

  const rejectWithdrawal = async (id: string): Promise<boolean> => {
    try {
      console.log('🔄 Rejeitando saque:', id);
      
      const { data, error } = await supabase.rpc('reject_withdrawal', {
        withdrawal_id: id
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

      const result = data as { success: boolean; error?: string };
      if (result && !result.success) {
        console.error('❌ Falha na rejeição:', result.error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Erro ao rejeitar saque.",
        });
        return false;
      }

      console.log('✅ Saque rejeitado com sucesso');
      toast({
        title: "Sucesso",
        description: "Saque rejeitado com sucesso!",
      });

      await fetchWithdrawals();
      return true;
    } catch (error) {
      console.error('❌ Erro em rejectWithdrawal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      return false;
    }
  };

  const getTodaysWithdrawals = () => {
    const today = new Date().toISOString().split('T')[0];
    return withdrawals.filter(withdrawal => 
      withdrawal.created_at.startsWith(today)
    );
  };

  const getWithdrawalsByStatus = (status: 'requested' | 'processed' | 'rejected') => {
    return withdrawals.filter(withdrawal => withdrawal.status === status);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  // Set up real-time listening for withdrawal updates
  useEffect(() => {
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
          fetchWithdrawals();
        }
      )
      .subscribe();

    return () => {
      console.log('🛑 Desconectando listener real-time...');
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    withdrawals,
    loading,
    approveWithdrawal,
    rejectWithdrawal,
    getTodaysWithdrawals,
    getWithdrawalsByStatus,
    refetch: fetchWithdrawals
  };
};
