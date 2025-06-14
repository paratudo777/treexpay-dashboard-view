
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { DynamicTransactionChart } from '@/components/dashboard/DynamicTransactionChart';
import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { ArrowDownCircle, ArrowUpCircle, CreditCard, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useDashboardMetrics, type Period } from '@/hooks/useDashboardMetrics';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const [activePeriod, setActivePeriod] = useState<Period>('today');
  const { balance, loading: balanceLoading } = useUserBalance();
  const { metrics, loading: metricsLoading } = useDashboardMetrics(activePeriod);
  const { user } = useAuth();

  const handlePeriodChange = (period: Period) => {
    setActivePeriod(period);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with balance and period selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Dashboard
            </h1>
            <p className="text-lg text-gray-200">
              Saldo Total: <span className="text-treexpay-medium font-semibold">
                {balanceLoading ? 'Carregando...' : formatCurrency(balance)}
              </span>
            </p>
          </div>
          <PeriodSelector onPeriodChange={handlePeriodChange} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Vendas Realizadas" 
            value={metricsLoading ? 'Carregando...' : formatCurrency(metrics.totalDeposits)} 
            borderColor="#2a9d8f"
            icon={<ArrowDownCircle className="h-4 w-4" />}
          />
          <StatCard 
            title="Total de Vendas" 
            value={metricsLoading ? 'Carregando...' : metrics.depositCount.toString()} 
            borderColor="#2a9d8f"
            icon={<CreditCard className="h-4 w-4" />}
          />
          <StatCard 
            title="Saques Realizados" 
            value={metricsLoading ? 'Carregando...' : formatCurrency(metrics.totalWithdrawals)} 
            borderColor="#e74c3c"
            icon={<ArrowUpCircle className="h-4 w-4" />}
          />
          <StatCard 
            title="Ticket Médio" 
            value={metricsLoading ? 'Carregando...' : formatCurrency(metrics.averageTicket)} 
            borderColor="#117a8b"
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
