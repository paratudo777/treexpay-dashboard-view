
import { useMemo } from 'react';
import { useUserSettings } from './useUserSettings';

const PROVIDER_FEE = 1.50; // Taxa fixa do provedor por transação de depósito

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
    
    // Taxa fixa do provedor por transação de depósito (R$ 1,50 por depósito)
    const providerFees = depositCount * PROVIDER_FEE;
    
    // Total de taxas de depósito
    const totalDepositFees = percentageFee + providerFees;
    
    // Para o cálculo do saldo líquido, consideramos apenas as taxas de depósito
    // As taxas de saque são cobradas no momento do saque
    const netBalance = Math.max(0, grossBalance - totalDepositFees);

    return {
      grossBalance,
      netBalance,
      totalFees: totalDepositFees,
      depositFeePercentage,
      providerFee: providerFees,
      depositCount
    };
  }, [grossBalance, depositCount, settings]);

  return calculation;
};
