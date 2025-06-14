
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface LocalTransaction {
  id: string;
  code: string;
  type: string;
  status: string;
  created_at: string;
  description: string;
  amount: number;
  user_id: string;
}

export const useLocalTransactions = () => {
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Carregar transações do localStorage para o usuário atual
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const stored = localStorage.getItem(`transactions_${user.id}`);
    if (stored) {
      try {
        const parsedTransactions = JSON.parse(stored);
        // Filtrar apenas transações do usuário atual
        const userTransactions = parsedTransactions.filter((tx: LocalTransaction) => tx.user_id === user.id);
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Erro ao carregar transações do localStorage:', error);
        setTransactions([]);
      }
    }
  }, [user]);

  const addTransaction = (transaction: LocalTransaction) => {
    if (!user) return;

    const newTransaction = {
      ...transaction,
      user_id: user.id,
      id: transaction.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    setTransactions(prev => {
      const updated = [newTransaction, ...prev];
      localStorage.setItem(`transactions_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const updateTransaction = (id: string, updates: Partial<LocalTransaction>) => {
    if (!user) return;

    setTransactions(prev => {
      const updated = prev.map(tx => 
        tx.id === id ? { ...tx, ...updates } : tx
      );
      localStorage.setItem(`transactions_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const removeTransaction = (id: string) => {
    if (!user) return;

    setTransactions(prev => {
      const updated = prev.filter(tx => tx.id !== id);
      localStorage.setItem(`transactions_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllTransactions = () => {
    if (!user) return;

    setTransactions([]);
    localStorage.removeItem(`transactions_${user.id}`);
  };

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    removeTransaction,
    clearAllTransactions
  };
};
