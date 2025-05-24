
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type TransactionStatus = "pending" | "approved" | "cancelled" | "refunded";

export interface Transaction {
  id: string;
  code: string;
  status: TransactionStatus;
  transaction_date: string;
  description: string;
  amount: number;
}

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTransactions = async (statusFilter?: string) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('transactions')
        .select('id, code, status, transaction_date, description, amount')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      // Apply status filter if specified
      if (statusFilter && statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar transações.",
        });
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
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
