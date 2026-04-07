
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  borderColor: string;
  icon?: React.ReactNode;
}

export const StatCard = ({ title, value, borderColor, icon }: StatCardProps) => {
  return (
    <Card className="glass-card border-l-4 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 animate-fade-in"
      style={{ borderLeftColor: borderColor }}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-primary opacity-70">{icon}</div>}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
};
