
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;  
  status: 'requested' | 'processed' | 'rejected';
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  user?: {
    email: string;
    name?: string;
  };
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
          status,
          created_at,
          processed_at,
          processed_by,
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
        user: {
          email: withdrawal.profiles.email,
          name: withdrawal.profiles.name
        }
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

      if (data && !data.success) {
        console.error('❌ Falha na aprovação:', data.error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.error || "Erro ao aprovar saque.",
        });
        return false;
      }

      console.log('✅ Saque aprovado com sucesso');
      toast({
        title: "Sucesso",
        description: "Saque aprovado com sucesso!",
      });

      // Atualizar lista
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

      if (data && !data.success) {
        console.error('❌ Falha na rejeição:', data.error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: data.error || "Erro ao rejeitar saque.",
        });
        return false;
      }

      console.log('✅ Saque rejeitado com sucesso');
      toast({
        title: "Sucesso",
        description: "Saque rejeitado com sucesso!",
      });

      // Atualizar lista
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
    refetch: fetchWithdrawals
  };
};
