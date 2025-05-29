
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

  // Enhanced function to extract gross value from description with validation
  const extractGrossValue = (description: string, netAmount: number) => {
    if (!description || typeof description !== 'string') return netAmount;
    
    // Enhanced pattern matching with validation
    const patterns = [
      /Bruto:\s*R\$\s*([0-9,\.]+)/,
      /Valor:\s*R\$\s*([0-9,\.]+)/,
      /Total:\s*R\$\s*([0-9,\.]+)/
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const grossValue = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(grossValue) && grossValue > 0 && grossValue >= netAmount) {
          return grossValue;
        }
      }
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

      console.log('Fetching dashboard metrics with enhanced security:', {
        period,
        start: start.toISOString(),
        end: end.toISOString(),
        user: user.id
      });

      // Enhanced security: Explicit user validation in query
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
        console.error('Error fetching deposits:', salesError);
        throw salesError;
      }

      // Additional client-side validation
      const validatedSales = (sales || []).filter(transaction => 
        transaction.user_id === user.id && 
        transaction.amount > 0 &&
        transaction.status === 'approved'
      );

      console.log('Validated approved deposits:', validatedSales.length);

      // Fetch withdrawals with same security measures
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'approved')
        .eq('type', 'withdrawal')
        .eq('user_id', user.id)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString());

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError);
      }

      const validatedWithdrawals = (withdrawals || []).filter(transaction => 
        transaction.user_id === user.id && 
        transaction.amount > 0 &&
        transaction.status === 'approved'
      );

      // Calculate metrics with enhanced validation
      const salesWithGrossValues = validatedSales.map(transaction => ({
        ...transaction,
        grossAmount: extractGrossValue(transaction.description, transaction.amount)
      }));

      const totalDeposits = salesWithGrossValues.reduce((sum, t) => sum + t.grossAmount, 0);
      const totalWithdrawals = validatedWithdrawals.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Enhanced period filtering for today
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
      }
      
      const depositCount = todayApprovedSales.length;
      const todayTotalValue = todayApprovedSales.reduce((sum, t) => sum + t.grossAmount, 0);
      const averageTicket = depositCount > 0 ? todayTotalValue / depositCount : 0;

      // Calculate fees with validation
      const estimatedFees = salesWithGrossValues.reduce((sum, t) => {
        const grossValue = t.grossAmount;
        const netValue = t.amount;
        const feeAmount = grossValue - netValue;
        return sum + (feeAmount > 0 ? feeAmount : 0);
      }, 0);

      console.log('Enhanced metrics calculated:', {
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
      console.error('Error fetching metrics:', error);
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

    // Enhanced real-time subscription with additional security
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
          
          console.log('Transaction change detected:', payload);
          
          // Additional validation before refetching
          if ((newRecord?.user_id === user.id && newRecord?.status === 'approved') || 
              (oldRecord?.user_id === user.id && oldRecord?.status === 'approved')) {
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
