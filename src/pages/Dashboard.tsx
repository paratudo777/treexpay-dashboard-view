
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { DynamicTransactionChart } from '@/components/dashboard/DynamicTransactionChart';
import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { ArrowDownCircle, ArrowUpCircle, CreditCard, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useDashboardMetrics, type Period, type DateRange } from '@/hooks/useDashboardMetrics';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const [activePeriod, setActivePeriod] = useState<Period>('today');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const { balance, loading: balanceLoading } = useUserBalance();
  const { metrics, loading: metricsLoading } = useDashboardMetrics(activePeriod, customDateRange);
  const { user } = useAuth();

  const handlePeriodChange = (period: Period, dateRange?: DateRange) => {
    setActivePeriod(period);
    setCustomDateRange(dateRange);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with balance and period selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-lg text-muted-foreground">
              Saldo Total: <span className="text-primary font-semibold">
                {balanceLoading ? 'Carregando...' : formatCurrency(balance)}
              </span>
            </p>
          </div>
          <PeriodSelector onPeriodChange={handlePeriodChange} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Vendas Realizadas" 
            value={metricsLoading ? 'Carregando...' : formatCurrency(metrics.totalDeposits)} 
            borderColor="hsl(263 70% 58%)"
            icon={<ArrowDownCircle className="h-4 w-4" />}
          />
          <StatCard 
            title="Total de Vendas" 
            value={metricsLoading ? 'Carregando...' : metrics.depositCount.toString()} 
            borderColor="hsl(280 80% 65%)"
            icon={<CreditCard className="h-4 w-4" />}
          />
          <StatCard 
            title="Saques Realizados" 
            value={metricsLoading ? 'Carregando...' : formatCurrency(metrics.totalWithdrawals)} 
            borderColor="hsl(0 84% 60%)"
            icon={<ArrowUpCircle className="h-4 w-4" />}
          />
          <StatCard 
            title="Ticket Médio" 
            value={metricsLoading ? 'Carregando...' : formatCurrency(metrics.averageTicket)} 
            borderColor="hsl(263 70% 45%)"
            icon={<DollarSign className="h-4 w-4" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <DynamicTransactionChart data={metrics.chartData} loading={metricsLoading} />
          <StatusPieChart />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
