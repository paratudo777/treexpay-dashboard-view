
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type TransactionStatus = "pending" | "approved" | "cancelled" | "refunded";

export interface Transaction {
  id: string;
  code: string;
  status: TransactionStatus;
  created_at: string;
  description: string;
  amount: number;
  type: string;
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTransactions = async (statusFilter?: TransactionStatus) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('transactions')
        .select('id, code, status, created_at, description, amount, type')
        .eq('user_id', user.id)
        .gt('amount', 0) // Filtrar transações com valor zero
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar transações.",
        });
        return;
      }

      // Filtro adicional para remover transações com valores zerados ou negativos
      const filteredData = (data || []).filter(transaction => 
        transaction.amount > 0 && 
        !transaction.description.includes('Ref:') || // Remover transações com referência técnica
        transaction.status === 'approved' // Manter apenas aprovadas se tiver referência
      );

      setTransactions(filteredData);
    } catch (error) {
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
    fetchTransactions();
  }, [user]);

  return {
    transactions,
    loading,
    fetchTransactions,
    refetch: () => fetchTransactions()
  };
};
