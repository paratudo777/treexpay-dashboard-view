
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type TransactionStatus = "pending" | "approved" | "cancelled" | "refunded" | "denied";

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

  const fetchTransactions = useCallback(async (statusFilter?: TransactionStatus) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

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
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar transações.",
        });
        return;
      }

      setTransactions((data || []).filter(t => t.amount > 0));
    } catch {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const refreshTransactions = useCallback(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`transactions-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Patch local instantâneo (sub-segundo), sem refetch
          const newRow = payload.new as Transaction | undefined;
          const oldRow = payload.old as Transaction | undefined;

          if (payload.eventType === 'INSERT' && newRow && newRow.amount > 0) {
            setTransactions((prev) =>
              prev.some((t) => t.id === newRow.id) ? prev : [newRow, ...prev]
            );
          } else if (payload.eventType === 'UPDATE' && newRow) {
            setTransactions((prev) =>
              prev.map((t) => (t.id === newRow.id ? { ...t, ...newRow } : t))
            );
          } else if (payload.eventType === 'DELETE' && oldRow) {
            setTransactions((prev) => prev.filter((t) => t.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    transactions,
    loading,
    fetchTransactions,
    refreshTransactions,
    refetch: refreshTransactions
  };
};
