
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface LocalTransaction {
  id: string;
  code: string;
  type: 'withdrawal' | 'deposit' | 'payment';
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'denied' | 'paid' | 'cancelled' | 'refunded';
  created_at: string;
  user_id: string;
}

const TRANSACTIONS_STORAGE_KEY = 'localTransactions';

export const useLocalTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (stored) {
      try {
        const allTransactions = JSON.parse(stored);
        const userTransactions = user ? allTransactions.filter((tx: LocalTransaction) => tx.user_id === user.id) : [];
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Error parsing transactions:', error);
        setTransactions([]);
      }
    }
    setLoading(false);
  }, [user]);

  const saveAllTransactions = (allTransactions: LocalTransaction[]) => {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(allTransactions));
  };

  const addTransaction = (transaction: LocalTransaction) => {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    let allTransactions: LocalTransaction[] = [];
    
    if (stored) {
      try {
        allTransactions = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing transactions:', error);
      }
    }

    allTransactions.push(transaction);
    saveAllTransactions(allTransactions);
    
    if (user && transaction.user_id === user.id) {
      setTransactions(prev => [...prev, transaction]);
    }
  };

  const updateTransactionStatus = (id: string, status: LocalTransaction['status']) => {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (!stored) return;

    try {
      const allTransactions: LocalTransaction[] = JSON.parse(stored);
      const updatedTransactions = allTransactions.map(tx => 
        tx.id === id ? { ...tx, status } : tx
      );
      
      saveAllTransactions(updatedTransactions);
      
      if (user) {
        const userTransactions = updatedTransactions.filter(tx => tx.user_id === user.id);
        setTransactions(userTransactions);
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  return {
    transactions,
    loading,
    addTransaction,
    updateTransactionStatus,
    refetch: () => {
      const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (stored && user) {
        try {
          const allTransactions = JSON.parse(stored);
          const userTransactions = allTransactions.filter((tx: LocalTransaction) => tx.user_id === user.id);
          setTransactions(userTransactions);
        } catch (error) {
          console.error('Error refetching transactions:', error);
        }
      }
    }
  };
};
