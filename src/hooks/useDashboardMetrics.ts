import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type Period = 'today' | 'week' | '15days' | 'month' | 'monthStart' | 'all';

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
  const { user } = useAuth();
  const { toast } = useToast();

  const getDateRange = (period: Period) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return { start: todayStart, end: todayEnd };
      case 'week':
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        weekStart.setHours(0, 0, 0, 0);
        return { start: weekStart, end: new Date() };
      case '15days':
        const fifteenDaysStart = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
        fifteenDaysStart.setHours(0, 0, 0, 0);
        return { start: fifteenDaysStart, end: new Date() };
      case 'month':
        const monthStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        monthStart.setHours(0, 0, 0, 0);
        return { start: monthStart, end: new Date() };
      case 'monthStart':
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentMonthStart.setHours(0, 0, 0, 0);
        return { start: currentMonthStart, end: new Date() };
      case 'all':
        const allTimeStart = new Date('2020-01-01');
        return { start: allTimeStart, end: new Date() };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  // Função para extrair valor bruto da descrição
  const extractGrossValue = (description: string, netAmount: number) => {
    if (!description) return netAmount;
    
    // Procurar por "Valor: R$ XX.XX" na descrição
    const match = description.match(/Valor:\s*R\$\s*([0-9,\.]+)/);
    if (match) {
      const grossValue = parseFloat(match[1].replace(',', '.'));
      return isNaN(grossValue) ? netAmount : grossValue;
    }
    
    return netAmount;
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
        user: user.id
      });

      // Buscar apenas depósitos aprovados únicos
      const { data: sales, error: salesError } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'deposit')
        .eq('user_id', user.id)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString())
        .order('updated_at', { ascending: false });

      if (salesError) {
        console.error('Erro ao buscar depósitos:', salesError);
        throw salesError;
      }

      console.log('Depósitos aprovados encontrados:', sales?.length || 0, sales);

      // Buscar saques aprovados
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'withdrawal')
        .eq('user_id', user.id)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString());

      if (withdrawalsError) {
        console.error('Erro ao buscar saques:', withdrawalsError);
      }

      console.log('Saques aprovados encontrados:', withdrawals?.length || 0);

      // Calcular métricas usando valores brutos extraídos das descrições
      const salesWithGrossValues = sales?.map(transaction => ({
        ...transaction,
        grossAmount: extractGrossValue(transaction.description, transaction.amount)
      })) || [];

      const totalDeposits = salesWithGrossValues.reduce((sum, t) => sum + t.grossAmount, 0);
      const totalWithdrawals = withdrawals?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      // CORREÇÃO: Para período "today", filtrar apenas transações do dia atual
      let todayApprovedSales = salesWithGrossValues;
      if (period === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        todayApprovedSales = salesWithGrossValues.filter(transaction => {
          const transactionDate = new Date(transaction.updated_at);
          return transactionDate >= todayStart && transactionDate <= todayEnd;
        });
        
        console.log('Transações aprovadas filtradas para hoje:', todayApprovedSales.length);
      }
      
      const depositCount = todayApprovedSales.length;
      const todayTotalValue = todayApprovedSales.reduce((sum, t) => sum + t.grossAmount, 0);
      const averageTicket = depositCount > 0 ? todayTotalValue / depositCount : 0;

      // Calcular taxas estimadas
      const estimatedFees = salesWithGrossValues.reduce((sum, t) => {
        const grossValue = t.grossAmount;
        const netValue = t.amount;
        return sum + (grossValue - netValue);
      }, 0);

      console.log('Métricas calculadas:', {
        totalDeposits,
        totalWithdrawals,
        depositCount,
        averageTicket,
        estimatedFees,
        todayTotalValue
      });

      const chartData = generateChartData(salesWithGrossValues, period);

      setMetrics({
        totalDeposits,
        totalWithdrawals,
        depositCount,
        averageTicket,
        feesCollected: estimatedFees,
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
          const transactionDate = new Date(t.updated_at);
          return transactionDate >= hourStart && transactionDate < hourEnd;
        });

        const hourTotal = hourSales.reduce((sum, t) => sum + (t.grossAmount || t.amount), 0);
        
        data.push({ hora: `${hour.toString().padStart(2, '0')}h`, valor: hourTotal });
      }
    } else {
      const { start, end } = getDateRange(period);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const maxDays = period === 'all' ? 30 : Math.min(days, 15);

      for (let i = 0; i < maxDays; i++) {
        const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const daySales = sales.filter(t => {
          const transactionDate = new Date(t.updated_at);
          return transactionDate >= dayStart && transactionDate < dayEnd;
        });

        const dayTotal = daySales.reduce((sum, t) => sum + (t.grossAmount || t.amount), 0);
        
        const label = period === 'week' || period === '15days' ? 
          dayStart.toLocaleDateString('pt-BR', { weekday: 'short' }) :
          dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        data.push({ hora: label, valor: dayTotal });
      }
    }

    return data;
  };

  useEffect(() => {
    fetchMetrics();
  }, [user, period]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
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
  }, [user, period]);

  return {
    metrics,
    loading,
    refetch: fetchMetrics
  };
};
