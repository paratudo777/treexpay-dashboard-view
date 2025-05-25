
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionChart } from '@/components/dashboard/TransactionChart';
import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { ArrowDownCircle, ArrowUpCircle, CreditCard, DollarSign, PercentCircle } from 'lucide-react';
import { useState } from 'react';
import { useUserBalance } from '@/hooks/useUserBalance';

type Period = 'today' | 'week' | 'month' | 'year';

// Mock data for different periods
const periodData = {
  today: {
    deposits: 'R$ 5.200,00',
    withdrawals: 'R$ 2.035,69',
    totalDeposits: '32',
    averageTicket: 'R$ 162,50',
    fees: 'R$ 780,00',
  },
  week: {
    deposits: 'R$ 32.100,00',
    withdrawals: 'R$ 10.154,88',
    totalDeposits: '198',
    averageTicket: 'R$ 162,12',
    fees: 'R$ 4.815,00',
  },
  month: {
    deposits: 'R$ 125.400,00',
    withdrawals: 'R$ 35.637,57',
    totalDeposits: '723',
    averageTicket: 'R$ 173,44',
    fees: 'R$ 18.810,00',
  },
  year: {
    deposits: 'R$ 1.685.200,00',
    withdrawals: 'R$ 642.383,28',
    totalDeposits: '9.124',
    averageTicket: 'R$ 184,70',
    fees: 'R$ 252.780,00',
  },
};

const Dashboard = () => {
  const [activePeriod, setActivePeriod] = useState<Period>('today');
  const { balance, loading } = useUserBalance();
  const currentData = periodData[activePeriod];

  const handlePeriodChange = (period: Period) => {
    setActivePeriod(period);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with balance and period selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Saldo Total: <span className="text-treexpay-medium font-semibold">
                {loading ? 'Carregando...' : `R$ ${balance.toFixed(2)}`}
              </span>
            </p>
          </div>
          <PeriodSelector onPeriodChange={handlePeriodChange} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard 
            title="Depósitos Realizados" 
            value={currentData.deposits} 
            borderColor="#2a9d8f"
            icon={<ArrowDownCircle className="h-4 w-4" />}
          />
          <StatCard 
            title="Saques Realizados" 
            value={currentData.withdrawals} 
            borderColor="#b00020"
            icon={<ArrowUpCircle className="h-4 w-4" />}
          />
          <StatCard 
            title="Total de Depósitos" 
            value={currentData.totalDeposits} 
            borderColor="#2a9d8f"
            icon={<CreditCard className="h-4 w-4" />}
          />
          <StatCard 
            title="Ticket Médio" 
            value={currentData.averageTicket} 
            borderColor="#117a8b"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <StatCard 
            title="Taxas Coletadas" 
            value={currentData.fees} 
            borderColor="#117a8b"
            icon={<PercentCircle className="h-4 w-4" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <TransactionChart />
          <StatusPieChart />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
