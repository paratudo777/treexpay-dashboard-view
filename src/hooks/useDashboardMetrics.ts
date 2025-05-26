
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type Period = 'today' | 'week' | 'month' | 'year';

interface DashboardMetrics {
  totalDeposits: number;
  totalWithdrawals: number;
  depositCount: number;
  averageTicket: number;
  feesCollected: number;
  chartData: Array<{ hora: string; valor: number }>;
}

export const useDashboardMetrics = (period: Period = 'today') => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    depositCount: 0,
    averageTicket: 0,
    feesCollected: 0,
    chartData: []
  });
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const getDateRange = (period: Period) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: weekStart, end: new Date() };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: new Date() };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: new Date() };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
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

      console.log('Buscando métricas do dashboard:', {
        period,
        start: start.toISOString(),
        end: end.toISOString(),
        user: user.id,
        isAdmin
      });

      // Buscar vendas aprovadas (payments) para "Depósitos Realizados"
      let salesQuery = supabase
        .from('transactions')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'payment') // Vendas são do tipo 'payment'
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (!isAdmin) {
        salesQuery = salesQuery.eq('user_id', user.id);
      }

      const { data: sales, error: salesError } = await salesQuery;

      if (salesError) {
        console.error('Erro ao buscar vendas:', salesError);
        throw salesError;
      }

      console.log('Vendas aprovadas encontradas:', sales?.length || 0, sales);

      // Buscar saques aprovados
      let withdrawalsQuery = supabase
        .from('transactions')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'withdrawal')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      if (!isAdmin) {
        withdrawalsQuery = withdrawalsQuery.eq('user_id', user.id);
      }

      const { data: withdrawals, error: withdrawalsError } = await withdrawalsQuery;

      if (withdrawalsError) {
        console.error('Erro ao buscar saques:', withdrawalsError);
      }

      // Calcular métricas das vendas (valor bruto, sem taxas)
      const totalDeposits = sales?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalWithdrawals = withdrawals?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const depositCount = sales?.length || 0;
      const averageTicket = depositCount > 0 ? totalDeposits / depositCount : 0;

      // Calcular taxas coletadas (apenas das vendas)
      const feesCollected = sales?.reduce((sum, t) => {
        const transactionValue = Number(t.amount);
        const percentageFee = transactionValue * 0.0599; // 5.99%
        const fixedFee = 1.50;
        return sum + percentageFee + fixedFee;
      }, 0) || 0;

      console.log('Métricas calculadas:', {
        totalDeposits,
        totalWithdrawals,
        depositCount,
        averageTicket,
        feesCollected
      });

      const chartData = generateChartData(sales || [], period);

      setMetrics({
        totalDeposits,
        totalWithdrawals,
        depositCount,
        averageTicket,
        feesCollected,
        chartData
      });

    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (sales: any[], period: Period) => {
    const data: Array<{ hora: string; valor: number }> = [];

    if (period === 'today') {
      for (let hour = 0; hour < 24; hour += 2) {
        const hourStart = new Date();
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date();
        hourEnd.setHours(hour + 2, 0, 0, 0);

        const hourSales = sales.filter(t => {
          const transactionDate = new Date(t.created_at);
          return transactionDate >= hourStart && transactionDate < hourEnd;
        });

        const hourTotal = hourSales.reduce((sum, t) => sum + Number(t.amount), 0);
        data.push({ hora: `${hour.toString().padStart(2, '0')}h`, valor: hourTotal });
      }
    } else {
      const { start, end } = getDateRange(period);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      for (let i = 0; i < Math.min(days, 12); i++) {
        const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const daySales = sales.filter(t => {
          const transactionDate = new Date(t.created_at);
          return transactionDate >= dayStart && transactionDate < dayEnd;
        });

        const dayTotal = daySales.reduce((sum, t) => sum + Number(t.amount), 0);
        const label = period === 'week' ? 
          dayStart.toLocaleDateString('pt-BR', { weekday: 'short' }) :
          dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        data.push({ hora: label, valor: dayTotal });
      }
    }

    return data;
  };

  useEffect(() => {
    fetchMetrics();
  }, [user, period, isAdmin]);

  useEffect(() => {
    if (!user) return;

    let filter = isAdmin ? 
      'status=eq.approved' : 
      `user_id=eq.${user.id}`;

    const channel = supabase
      .channel('dashboard-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: filter
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          console.log('Mudança detectada nas transações:', payload);
          
          if (newRecord?.status === 'approved' || oldRecord?.status === 'approved') {
            fetchMetrics();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, period, isAdmin]);

  return {
    metrics,
    loading,
    refetch: fetchMetrics
  };
};
