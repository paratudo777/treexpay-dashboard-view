import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ChartData {
  hora?: string;
  date: string;
  valor?: number;
  deposits: number;
  withdrawals: number;
}

interface DynamicTransactionChartProps {
  data: ChartData[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatShort = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value || 0;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl shadow-primary/10">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{formatCurrency(value)}</p>
    </div>
  );
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload?.deposits && payload?.deposits !== 0) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="hsl(263, 70%, 50%)" fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={3} fill="hsl(263, 70%, 58%)" stroke="hsl(263, 70%, 70%)" strokeWidth={1.5} />
    </g>
  );
};

const CustomActiveDot = (props: any) => {
  const { cx, cy } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="hsl(263, 70%, 50%)" fillOpacity={0.1}>
        <animate attributeName="r" from="8" to="14" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="fill-opacity" from="0.15" to="0" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={5} fill="hsl(263, 70%, 58%)" stroke="white" strokeWidth={2} />
    </g>
  );
};

export const DynamicTransactionChart = ({ data, loading }: DynamicTransactionChartProps) => {
  const total = data.reduce((sum, d) => sum + (d.deposits || 0), 0);

  return (
    <Card className="col-span-4 border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardHeader className="p-5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Volume de Transações Aprovadas</CardTitle>
              {!loading && <p className="text-xs text-muted-foreground mt-0.5">Total: {formatCurrency(total)}</p>}
            </div>
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
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0.3} />
                    <stop offset="50%" stopColor="hsl(263, 70%, 50%)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(263, 70%, 50%)" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glowLine">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="hsl(260, 10%, 20%)"
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey={data[0]?.hora ? 'hora' : 'date'}
                  stroke="hsl(260, 10%, 40%)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="hsl(260, 10%, 40%)"
                  fontSize={11}
                  tickFormatter={formatShort}
                  tickLine={false}
                  axisLine={false}
                  dx={-4}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(263, 70%, 50%)', strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.4 }} />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  stroke="hsl(263, 70%, 58%)"
                  strokeWidth={2.5}
                  fill="url(#chartGradientPrimary)"
                  dot={<CustomDot />}
                  activeDot={<CustomActiveDot />}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
