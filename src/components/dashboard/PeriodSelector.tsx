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
      setSelectedDate({ from: new Date() });
      setIsCalendarOpen(true);
      return;
    }
    setCustomDateRange(null);
    setSelectedDate({});
    onPeriodChange(period);
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) { setSelectedDate({}); return; }
    setSelectedDate(range);
    if (range.from && range.to) {
      if (range.to < range.from) {
        toast({ variant: 'destructive', title: 'Erro', description: 'A data final não pode ser anterior à data inicial.' });
        return;
      }
      const dateRange: DateRange = { from: range.from, to: range.to };
      setCustomDateRange(dateRange);
      setIsCalendarOpen(false);
      onPeriodChange('custom', dateRange);
      toast({
        title: 'Período aplicado',
        description: `${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} — ${format(range.to, 'dd/MM/yyyy', { locale: ptBR })}`,
      });
    }
  };

  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: '7 dias' },
    { value: '15days', label: '15 dias' },
    { value: 'month', label: '30 dias' },
    { value: 'monthStart', label: 'Início do Mês' },
    { value: 'all', label: 'Tudo' },
    { value: 'custom', label: 'Personalizado' },
  ];

  const getCalendarSelection = () => {
    if (selectedDate.from && selectedDate.to) return { from: selectedDate.from, to: selectedDate.to };
    if (selectedDate.from) return { from: selectedDate.from, to: selectedDate.from };
    return undefined;
  };

  return (
    <div className="w-full sm:w-auto space-y-2">
      <Select value={activePeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-full sm:w-[200px] bg-primary hover:bg-primary/90 text-primary-foreground border-primary font-semibold h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full sm:w-[200px] justify-start text-left font-normal h-auto min-h-[40px]",
              !selectedDate.from && "text-muted-foreground",
              activePeriod !== 'custom' && "hidden"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="text-sm truncate">
              {selectedDate.from
                ? selectedDate.to
                  ? `${format(selectedDate.from, 'dd/MM/yy', { locale: ptBR })} - ${format(selectedDate.to, 'dd/MM/yy', { locale: ptBR })}`
                  : `${format(selectedDate.from, 'dd/MM/yy', { locale: ptBR })} - ...`
                : 'Selecione'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedDate.from || new Date()}
            selected={getCalendarSelection()}
            onSelect={handleDateRangeSelect}
            numberOfMonths={1}
            locale={ptBR}
            className="pointer-events-auto"
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
