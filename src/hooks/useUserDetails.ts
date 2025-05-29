
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type UserTransaction = {
  id: string;
  code: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  description: string;
  deposit_id?: string;
};

export type UserDetails = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  profile: string;
  active: boolean;
  balance: number;
  created_at: string;
  updated_at: string;
};

export const useUserDetails = (userId: string | null) => {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUserDetails = async (id: string) => {
    try {
      setLoading(true);
      
      // Enhanced security: Validate user ID format
      if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid user ID format');
      }
      
      // Fetch user data with explicit security checks
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) {
        console.error('Error fetching user details:', userError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao buscar dados do usuário.",
        });
        return;
      }

      setUserDetails(userData);

      // Fetch transactions with enhanced security validation
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', id)
        .gt('amount', 0)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching user transactions:', transactionsError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao buscar transações do usuário.",
        });
        return;
      }

      // Additional validation and sanitization
      const filteredTransactions = (transactionsData || []).filter(transaction => 
        transaction.amount > 0 && transaction.user_id === id
      );

      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error in fetchUserDetails:', error);
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
    if (userId) {
      fetchUserDetails(userId);
    } else {
      setUserDetails(null);
      setTransactions([]);
    }
  }, [userId]);

  return {
    userDetails,
    transactions,
    loading,
    refetch: userId ? () => fetchUserDetails(userId) : () => {}
  };
};
