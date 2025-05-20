
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { hora: '00h', valor: 1200 },
  { hora: '02h', valor: 800 },
  { hora: '04h', valor: 1100 },
  { hora: '06h', valor: 1500 },
  { hora: '08h', valor: 2000 },
  { hora: '10h', valor: 2400 },
  { hora: '12h', valor: 1800 },
  { hora: '14h', valor: 2200 },
  { hora: '16h', valor: 2600 },
  { hora: '18h', valor: 3000 },
  { hora: '20h', valor: 2500 },
  { hora: '22h', valor: 1900 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const TransactionChart = () => {
  return (
    <Card className="col-span-4">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg font-medium">Volume de Transações</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2a9d8f" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2a9d8f" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis dataKey="hora" stroke="var(--muted-foreground)" />
              <YAxis 
                stroke="var(--muted-foreground)"
                tickFormatter={formatCurrency}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value as number), 'Valor']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                labelStyle={{
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="valor" 
                stroke="#2a9d8f" 
                fillOpacity={1}
                fill="url(#colorVolume)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
