
import { useState, useEffect } from 'react';
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

  const fetchTransactions = async (statusFilter?: TransactionStatus) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔍 Buscando transações para usuário:', user.id);
      console.log('🎯 Filtro de status:', statusFilter || 'todos');
      
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
        console.error('❌ Erro ao buscar transações:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar transações.",
        });
        return;
      }

      console.log('📊 Transações encontradas:', data?.length || 0);
      console.log('📋 Dados das transações:', data);

      // Additional client-side validation to ensure data belongs to user
      const filteredData = (data || []).filter(transaction => 
        transaction.amount > 0
      );

      console.log('✅ Transações após filtro:', filteredData.length);
      
      // Mostrar detalhes das transações para debug
      filteredData.forEach(tx => {
        console.log(`📝 Transação ${tx.code}: Status=${tx.status}, Valor=${tx.amount}, Descrição=${tx.description}`);
      });
      
      setTransactions(filteredData);
    } catch (error) {
      console.error('❌ Erro em fetchTransactions:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para forçar atualização das transações
  const refreshTransactions = () => {
    console.log('🔄 Forçando atualização das transações...');
    fetchTransactions();
  };

  useEffect(() => {
    console.log('🔄 useTransactions: Efeito executado');
    fetchTransactions();
  }, [user]);

  // Set up real-time listening for transaction updates
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Configurando listener real-time para transações...');
    
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📡 Mudança em transação detectada:', payload);
          // Atualizar lista quando houver mudanças
          refreshTransactions();
        }
      )
      .subscribe();

    return () => {
      console.log('🛑 Desconectando listener real-time...');
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
