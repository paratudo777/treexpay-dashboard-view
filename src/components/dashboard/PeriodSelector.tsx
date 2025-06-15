
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
      return 'Personalizado';
    }
    return periodOptions.find(option => option.value === activePeriod)?.label || 'Hoje';
  };

  const formatDateRange = () => {
    if (activePeriod === 'custom' && customDateRange) {
      const fromDate = format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR });
      const toDate = format(customDateRange.to, 'dd/MM/yyyy', { locale: ptBR });
      return `De ${fromDate} até ${toDate}`;
    }
    return null;
  };

  // Create a proper DateRange for the Calendar component or undefined
  const getCalendarSelection = () => {
    if (selectedDate.from && selectedDate.to) {
      return { from: selectedDate.from, to: selectedDate.to };
    }
    return undefined;
  };

  return (
    <div className="w-full sm:w-auto space-y-2">
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

      {/* Calendário para seleção personalizada */}
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full sm:w-[280px] justify-start text-left font-normal",
              !selectedDate.from && "text-muted-foreground",
              activePeriod !== 'custom' && "hidden"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate.from ? (
              selectedDate.to ? (
                <>
                  {format(selectedDate.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(selectedDate.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(selectedDate.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione o período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedDate.from}
            selected={getCalendarSelection()}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Exibir período personalizado selecionado */}
      {formatDateRange() && (
        <div className="text-sm text-gray-300 font-medium">
          → {formatDateRange()}
        </div>
      )}
    </div>
  );
};
