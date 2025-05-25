
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Period = 'today' | 'week' | 'month' | 'year';

interface PeriodSelectorProps {
  onPeriodChange: (period: Period) => void;
}

export const PeriodSelector = ({ onPeriodChange }: PeriodSelectorProps) => {
  const [activePeriod, setActivePeriod] = useState<Period>('today');

  const handlePeriodChange = (period: Period) => {
    setActivePeriod(period);
    onPeriodChange(period);
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant={activePeriod === 'today' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handlePeriodChange('today')}
        className={
          activePeriod === 'today' 
            ? 'bg-treexpay-dark text-white border-treexpay-dark' 
            : 'bg-transparent border-gray-300 text-gray-200 hover:bg-gray-700 hover:text-white hover:border-gray-500'
        }
      >
        Hoje
      </Button>
      <Button
        variant={activePeriod === 'week' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handlePeriodChange('week')}
        className={
          activePeriod === 'week' 
            ? 'bg-treexpay-dark text-white border-treexpay-dark' 
            : 'bg-transparent border-gray-300 text-gray-200 hover:bg-gray-700 hover:text-white hover:border-gray-500'
        }
      >
        Últimos 7 dias
      </Button>
      <Button
        variant={activePeriod === 'month' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handlePeriodChange('month')}
        className={
          activePeriod === 'month' 
            ? 'bg-treexpay-dark text-white border-treexpay-dark' 
            : 'bg-transparent border-gray-300 text-gray-200 hover:bg-gray-700 hover:text-white hover:border-gray-500'
        }
      >
        Este Mês
      </Button>
      <Button
        variant={activePeriod === 'year' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handlePeriodChange('year')}
        className={
          activePeriod === 'year' 
            ? 'bg-treexpay-dark text-white border-treexpay-dark' 
            : 'bg-transparent border-gray-300 text-gray-200 hover:bg-gray-700 hover:text-white hover:border-gray-500'
        }
      >
        Este Ano
      </Button>
    </div>
  );
};
