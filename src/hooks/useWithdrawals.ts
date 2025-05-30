
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type WithdrawalStatus = "requested" | "processed" | "rejected";

export interface Withdrawal {
  id: string;
  name: string;
  email: string;
  amount: number;
  pix_key_type: string;
  pix_key: string;
  status: WithdrawalStatus;
  request_date: string;
  user_id: string;
}

interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export const useWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
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
          amount,
          pix_key_type,
          pix_key,
          status,
          request_date,
          user_id,
          profiles!inner(name, email)
        `)
        .order('request_date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar solicitações de saque:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar solicitações de saque.",
        });
        return;
      }

      const formattedWithdrawals: Withdrawal[] = data.map((withdrawal: any) => ({
        id: withdrawal.id,
        name: withdrawal.profiles.name,
        email: withdrawal.profiles.email,
        amount: withdrawal.amount,
        pix_key_type: withdrawal.pix_key_type,
        pix_key: withdrawal.pix_key,
        status: withdrawal.status,
        request_date: withdrawal.request_date,
        user_id: withdrawal.user_id
      }));

      setWithdrawals(formattedWithdrawals);
    } catch (error) {
      console.error('Erro interno ao buscar solicitações:', error);
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
      
      // Using supabase.rpc with any type to avoid TypeScript errors
      const { data, error } = await (supabase as any).rpc('aprovar_saque', {
        saque_id: id,
        valor: amount
      });

      if (error) {
        console.error('Erro ao aprovar saque:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao aprovar solicitação de saque.",
        });
        return;
      }

      const response = data as RpcResponse;
      
      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: response.error || "Erro ao aprovar solicitação.",
        });
        return;
      }

      // Atualizar estado local
      setWithdrawals(prev => 
        prev.map(withdrawal => 
          withdrawal.id === id 
            ? { ...withdrawal, status: 'processed' as WithdrawalStatus }
            : withdrawal
        )
      );

      toast({
        title: "Sucesso",
        description: "Solicitação de saque aprovada com sucesso.",
      });
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
      
      // Using supabase.rpc with any type to avoid TypeScript errors
      const { data, error } = await (supabase as any).rpc('rejeitar_saque', {
        saque_id: id
      });

      if (error) {
        console.error('Erro ao rejeitar saque:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao rejeitar solicitação de saque.",
        });
        return;
      }

      const response = data as RpcResponse;
      
      if (!response.success) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: response.error || "Erro ao rejeitar solicitação.",
        });
        return;
      }

      // Atualizar estado local
      setWithdrawals(prev => 
        prev.map(withdrawal => 
          withdrawal.id === id 
            ? { ...withdrawal, status: 'rejected' as WithdrawalStatus }
            : withdrawal
        )
      );

      toast({
        title: "Sucesso",
        description: "Solicitação de saque rejeitada com sucesso.",
      });
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
