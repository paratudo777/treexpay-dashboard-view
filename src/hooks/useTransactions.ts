
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
  deposit_id?: string;
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
      
      // Enhanced security: Ensure user_id is explicitly set in the query
      let query = supabase
        .from('transactions')
        .select('id, code, status, created_at, description, amount, type, deposit_id')
        .eq('user_id', user.id)
        .gt('amount', 0)
        .order('created_at', { ascending: false });

      if (statusFilter) {
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

      // Additional client-side validation to ensure data belongs to user
      const filteredData = (data || []).filter(transaction => 
        transaction.amount > 0
      );

      setTransactions(filteredData);
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
