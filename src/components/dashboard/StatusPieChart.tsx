import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const COLORS = {
  approved: { fill: '#10b981', glow: '#10b98140' },
  pending: { fill: '#f59e0b', glow: '#f59e0b40' },
  cancelled: { fill: '#ef4444', glow: '#ef444440' },
  denied: { fill: '#8b5cf6', glow: '#8b5cf640' },
  refunded: { fill: '#6366f1', glow: '#6366f140' },
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovado',
  pending: 'Pendente',
  cancelled: 'Cancelado',
  denied: 'Negado',
  refunded: 'Estornado',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, fill, amount } = { ...payload[0].payload, fill: payload[0].payload.fill };
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl shadow-primary/10">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fill }} />
        <span className="text-sm font-semibold text-foreground">{name}</span>
      </div>
      <p className="text-xs text-muted-foreground">{value} transações</p>
      {amount !== undefined && <p className="text-xs text-muted-foreground">{formatCurrency(amount)}</p>}
    </div>
  );
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.9} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 8} outerRadius={outerRadius + 12} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground text-xl font-bold">{`${(percent * 100).toFixed(0)}%`}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-muted-foreground text-[11px]">{payload.name}</text>
    </g>
  );
};

export const StatusPieChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: txns } = await supabase
      .from('transactions')
      .select('status, amount')
      .eq('user_id', user!.id);

    if (txns) {
      const grouped: Record<string, { count: number; amount: number }> = {};
      txns.forEach((t: any) => {
        const s = t.status || 'pending';
        if (!grouped[s]) grouped[s] = { count: 0, amount: 0 };
        grouped[s].count++;
        grouped[s].amount += Number(t.amount) || 0;
      });

      const chartData = Object.entries(grouped).map(([status, info]) => ({
        name: STATUS_LABELS[status] || status,
        value: info.count,
        amount: info.amount,
        fill: (COLORS as any)[status]?.fill || '#6b7280',
      }));

      setData(chartData.length > 0 ? chartData : [{ name: 'Sem dados', value: 1, amount: 0, fill: '#374151' }]);
    }
    setLoading(false);
  };

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="col-span-2 border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="p-5 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <PieIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Status das Transações</CardTitle>
            {!loading && <p className="text-xs text-muted-foreground mt-0.5">{total} transações</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {data.map((entry, i) => (
                    <filter key={i} id={`glow-${i}`}>
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  ))}
                </defs>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} className="transition-all duration-300" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Legend */}
        {!loading && data[0]?.name !== 'Sem dados' && (
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {data.map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                <span className="text-[11px] text-muted-foreground">{entry.name}</span>
                <span className="text-[10px] text-muted-foreground/60">({entry.value})</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
