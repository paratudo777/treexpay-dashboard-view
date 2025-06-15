
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Period = 'today' | 'week' | '15days' | 'month' | 'monthStart' | 'all' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

interface PeriodSelectorProps {
  onPeriodChange: (period: Period, dateRange?: DateRange) => void;
}

export const PeriodSelector = ({ onPeriodChange }: PeriodSelectorProps) => {
  const [activePeriod, setActivePeriod] = useState<Period>('today');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{ from?: Date; to?: Date }>({});
  const { toast } = useToast();

  const handlePeriodChange = (period: Period) => {
    setActivePeriod(period);
    
    if (period === 'custom') {
      // Definir data atual como padrão quando abrir o calendário
      const today = new Date();
      setSelectedDate({ from: today });
      setIsCalendarOpen(true);
      return;
    }
    
    setCustomDateRange(null);
    setSelectedDate({});
    onPeriodChange(period);
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      setSelectedDate({});
      return;
    }
    
    setSelectedDate(range);
    
    // Se ambas as datas estão selecionadas
    if (range.from && range.to) {
      // Validar se a data final não é anterior à data inicial
      if (range.to < range.from) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "A data final não pode ser anterior à data inicial.",
        });
        return;
      }
      
      const dateRange: DateRange = {
        from: range.from,
        to: range.to
      };
      
      setCustomDateRange(dateRange);
      setIsCalendarOpen(false);
      onPeriodChange('custom', dateRange);
      
      toast({
        title: "Período personalizado aplicado",
        description: `Métricas atualizadas para o período de ${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} até ${format(range.to, 'dd/MM/yyyy', { locale: ptBR })}`,
      });
    }
  };

  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Últimos 7 dias' },
    { value: '15days', label: 'Últimos 15 dias' },
    { value: 'month', label: 'Últimos 30 dias' },
    { value: 'monthStart', label: 'Início do Mês' },
    { value: 'all', label: 'Tempo Todo' },
    { value: 'custom', label: 'Personalizado' }
  ];

  const getCurrentLabel = () => {
    if (activePeriod === 'custom' && customDateRange) {
      const fromDate = format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR });
      const toDate = format(customDateRange.to, 'dd/MM/yyyy', { locale: ptBR });
      return `${fromDate} - ${toDate}`;
    }
    return periodOptions.find(option => option.value === activePeriod)?.label || 'Hoje';
  };

  // Create a proper DateRange for the Calendar component or undefined
  const getCalendarSelection = () => {
    if (selectedDate.from && selectedDate.to) {
      return { from: selectedDate.from, to: selectedDate.to };
    }
    if (selectedDate.from) {
      return { from: selectedDate.from, to: selectedDate.from };
    }
    return undefined;
  };

  return (
    <div className="w-full sm:w-auto space-y-2">
      <Select value={activePeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-full sm:w-[220px] bg-treexpay-dark text-white border-treexpay-dark hover:bg-treexpay-medium min-h-[40px]">
          <SelectValue>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium">{getCurrentLabel()}</span>
              {activePeriod === 'custom' && (
                <CalendarIcon className="h-4 w-4 ml-2 opacity-70" />
              )}
            </div>
          </SelectValue>
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

      {/* Calendário para seleção personalizada */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <div className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedDate.from || new Date()}
            selected={getCalendarSelection()}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto"
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
