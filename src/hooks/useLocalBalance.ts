
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const BALANCE_STORAGE_KEY = 'userBalances';

interface UserBalance {
  userId: string;
  balance: number;
}

export const useLocalBalance = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem(BALANCE_STORAGE_KEY);
    let balances: UserBalance[] = [];
    
    if (stored) {
      try {
        balances = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing balances:', error);
      }
    }

    const userBalance = balances.find(b => b.userId === user.id);
    setBalance(userBalance?.balance || 1000); // Default balance for demo
    setLoading(false);
  }, [user]);

  const updateBalance = (newBalance: number) => {
    if (!user) return;

    const stored = localStorage.getItem(BALANCE_STORAGE_KEY);
    let balances: UserBalance[] = [];
    
    if (stored) {
      try {
        balances = JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing balances:', error);
      }
    }

    const existingIndex = balances.findIndex(b => b.userId === user.id);
    if (existingIndex >= 0) {
      balances[existingIndex].balance = newBalance;
    } else {
      balances.push({ userId: user.id, balance: newBalance });
    }

    localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(balances));
    setBalance(newBalance);
  };

  const deductBalance = (amount: number) => {
    const newBalance = Math.max(0, balance - amount);
    updateBalance(newBalance);
  };

  return {
    balance,
    loading,
    updateBalance,
    deductBalance,
    refetch: () => {} // Compatibility with existing code
  };
};
