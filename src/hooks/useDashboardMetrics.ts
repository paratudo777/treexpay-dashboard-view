
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Period = 'today' | 'week' | 'month';

interface DashboardMetrics {
  totalDeposits: number;
  totalWithdrawals: number;
  depositCount: number;
  withdrawalCount: number;
  averageTicket: number;
  chartData: Array<{
    hora?: string;
    date: string;
    valor?: number;
    deposits: number;
    withdrawals: number;
  }>;
}

export const useDashboardMetrics = (period: Period = 'today') => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    depositCount: 0,
    withdrawalCount: 0,
    averageTicket: 0,
    chartData: []
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const getDateRange = (period: Period) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return {
          start: weekStart,
          end: now
        };
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        return {
          start: monthStart,
          end: now
        };
      default:
        return { start: today, end: now };
    }
  };

  const fetchMetrics = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { start, end } = getDateRange(period);
      
      console.log('📊 Buscando métricas do dashboard para período:', period);
      console.log('📅 Range:', start.toISOString(), 'até', end.toISOString());

      // Buscar transações de depósito
      const { data: depositTransactions, error: depositError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('type', 'deposit')
        .eq('status', 'approved')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (depositError) {
        console.error('❌ Erro ao buscar transações de depósito:', depositError);
      }

      // Buscar saques processados
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawals')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('status', 'processed')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (withdrawalError) {
        console.error('❌ Erro ao buscar saques:', withdrawalError);
      }

      const deposits = depositTransactions || [];
      const withdrawals = withdrawalData || [];

      const totalDeposits = deposits.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
      const depositCount = deposits.length;
      const withdrawalCount = withdrawals.length;
      const averageTicket = depositCount > 0 ? totalDeposits / depositCount : 0;

      // Preparar dados do gráfico
      const chartData: Array<{ hora?: string; date: string; valor?: number; deposits: number; withdrawals: number }> = [];
      
      if (period === 'today') {
        // Para hoje, mostrar por horas
        for (let hour = 0; hour < 24; hour++) {
          const hourStart = new Date(start);
          hourStart.setHours(hour, 0, 0, 0);
          const hourEnd = new Date(start);
          hourEnd.setHours(hour + 1, 0, 0, 0);
          
          const hourDeposits = deposits
            .filter(t => new Date(t.created_at) >= hourStart && new Date(t.created_at) < hourEnd)
            .reduce((sum, t) => sum + Number(t.amount), 0);
            
          const hourWithdrawals = withdrawals
            .filter(w => new Date(w.created_at) >= hourStart && new Date(w.created_at) < hourEnd)
            .reduce((sum, w) => sum + Number(w.amount), 0);

          chartData.push({
            hora: `${hour.toString().padStart(2, '0')}:00`,
            date: `${hour.toString().padStart(2, '0')}:00`,
            valor: hourDeposits,
            deposits: hourDeposits,
            withdrawals: hourWithdrawals
          });
        }
      } else {
        // Para semana/mês, mostrar por dias
        const days = period === 'week' ? 7 : 30;
        for (let i = 0; i < days; i++) {
          const dayStart = new Date(start);
          dayStart.setDate(start.getDate() + i);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayStart.getDate() + 1);
          
          const dayDeposits = deposits
            .filter(t => new Date(t.created_at) >= dayStart && new Date(t.created_at) < dayEnd)
            .reduce((sum, t) => sum + Number(t.amount), 0);
            
          const dayWithdrawals = withdrawals
            .filter(w => new Date(w.created_at) >= dayStart && new Date(w.created_at) < dayEnd)
            .reduce((sum, w) => sum + Number(w.amount), 0);

          const dateStr = dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          chartData.push({
            date: dateStr,
            valor: dayDeposits,
            deposits: dayDeposits,
            withdrawals: dayWithdrawals
          });
        }
      }

      setMetrics({
        totalDeposits,
        totalWithdrawals,
        depositCount,
        withdrawalCount,
        averageTicket,
        chartData
      });

      console.log('✅ Métricas carregadas:', {
        totalDeposits,
        totalWithdrawals,
        depositCount,
        withdrawalCount,
        averageTicket
      });

    } catch (error) {
      console.error('❌ Erro em fetchMetrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period: Period) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return {
          start: weekStart,
          end: now
        };
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        return {
          start: monthStart,
          end: now
        };
      default:
        return { start: today, end: now };
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [user, period]);

  return {
    metrics,
    loading,
    refetch: fetchMetrics
  };
};
