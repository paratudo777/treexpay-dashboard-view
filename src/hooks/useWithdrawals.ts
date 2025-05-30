
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WithdrawalData {
  id: string;
  user_id: string;
  name: string;
  email: string;
  amount: number;
  pix_key_type: string;
  pix_key: string;
  status: 'requested' | 'processed' | 'rejected';
  request_date: string;
}

export const useWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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
          pix_key_type,
          pix_key,
          status,
          request_date,
          profiles!inner(
            name,
            email
          )
        `)
        .order('request_date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar saques:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar solicitações de saque.",
        });
        return;
      }

      const formattedData = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        name: (item.profiles as any)?.name || 'Nome não encontrado',
        email: (item.profiles as any)?.email || 'Email não encontrado',
        amount: item.amount,
        pix_key_type: item.pix_key_type,
        pix_key: item.pix_key,
        status: item.status as 'requested' | 'processed' | 'rejected',
        request_date: item.request_date,
      })) || [];

      setWithdrawals(formattedData);
    } catch (error) {
      console.error('Erro interno ao buscar saques:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (id: string, amount: number) => {
    try {
      setActionLoading(id);

      const { data, error } = await supabase.rpc('aprovar_saque', {
        saque_id: id,
        valor: amount
      });

      if (error) {
        console.error('Erro ao aprovar saque:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao aprovar saque.",
        });
        return;
      }

      const result = data as { success: boolean; message?: string; error?: string };

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Erro ao aprovar saque.",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: result.message || "Saque aprovado com sucesso.",
      });

      // Atualizar estado local
      setWithdrawals(prev => 
        prev.map(withdrawal => 
          withdrawal.id === id 
            ? { ...withdrawal, status: 'processed' as const }
            : withdrawal
        )
      );
    } catch (error) {
      console.error('Erro interno ao aprovar saque:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const rejectWithdrawal = async (id: string) => {
    try {
      setActionLoading(id);

      const { data, error } = await supabase.rpc('rejeitar_saque', {
        saque_id: id
      });

      if (error) {
        console.error('Erro ao rejeitar saque:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao rejeitar saque.",
        });
        return;
      }

      const result = data as { success: boolean; message?: string; error?: string };

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.error || "Erro ao rejeitar saque.",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: result.message || "Saque rejeitado com sucesso.",
      });

      // Atualizar estado local
      setWithdrawals(prev => 
        prev.map(withdrawal => 
          withdrawal.id === id 
            ? { ...withdrawal, status: 'rejected' as const }
            : withdrawal
        )
      );
    } catch (error) {
      console.error('Erro interno ao rejeitar saque:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  return {
    withdrawals,
    loading,
    actionLoading,
    refetch: fetchWithdrawals,
    approveWithdrawal,
    rejectWithdrawal
  };
};
