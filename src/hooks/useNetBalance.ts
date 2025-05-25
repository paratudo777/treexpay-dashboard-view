
import { useMemo } from 'react';
import { useUserSettings } from './useUserSettings';

const PROVIDER_FEE = 1.50; // Taxa fixa do provedor por transação

interface NetBalanceCalculation {
  grossBalance: number;
  netBalance: number;
  totalFees: number;
  depositFeePercentage: number;
  providerFee: number;
  depositCount: number;
}

export const useNetBalance = (userId: string, grossBalance: number, depositCount: number = 0): NetBalanceCalculation => {
  const { settings } = useUserSettings(userId);

  const calculation = useMemo(() => {
    if (!settings) {
      return {
        grossBalance,
        netBalance: grossBalance,
        totalFees: 0,
        depositFeePercentage: 0,
        providerFee: 0,
        depositCount: 0
      };
    }

    const depositFeePercentage = settings.deposit_fee || 0;
    
    // Taxa percentual sobre o saldo bruto
    const percentageFee = (grossBalance * depositFeePercentage) / 100;
    
    // Taxa fixa do provedor por transação
    const providerFees = depositCount * PROVIDER_FEE;
    
    // Total de taxas
    const totalFees = percentageFee + providerFees;
    
    // Saldo líquido
    const netBalance = Math.max(0, grossBalance - totalFees);

    return {
      grossBalance,
      netBalance,
      totalFees,
      depositFeePercentage,
      providerFee: providerFees,
      depositCount
    };
  }, [grossBalance, depositCount, settings]);

  return calculation;
};
