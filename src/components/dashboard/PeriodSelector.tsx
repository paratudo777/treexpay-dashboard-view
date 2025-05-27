
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Period = 'today' | 'week' | '15days' | 'month' | 'monthStart' | 'all';

interface PeriodSelectorProps {
  onPeriodChange: (period: Period) => void;
}

export const PeriodSelector = ({ onPeriodChange }: PeriodSelectorProps) => {
  const [activePeriod, setActivePeriod] = useState<Period>('today');

  const handlePeriodChange = (period: Period) => {
    setActivePeriod(period);
    onPeriodChange(period);
  };

  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Últimos 7 dias' },
    { value: '15days', label: 'Últimos 15 dias' },
    { value: 'month', label: 'Últimos 30 dias' },
    { value: 'monthStart', label: 'Início do Mês' },
    { value: 'all', label: 'Tempo Todo' }
  ];

  const getCurrentLabel = () => {
    return periodOptions.find(option => option.value === activePeriod)?.label || 'Hoje';
  };

  return (
    <div className="w-full sm:w-auto">
      <Select value={activePeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-full sm:w-[180px] bg-treexpay-dark text-white border-treexpay-dark hover:bg-treexpay-medium">
          <SelectValue placeholder={getCurrentLabel()} />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {periodOptions.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-gray-200 hover:bg-gray-700 focus:bg-gray-700 focus:text-white"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
