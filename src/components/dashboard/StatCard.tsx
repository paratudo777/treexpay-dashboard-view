
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  borderColor: string;
  icon?: React.ReactNode;
}

export const StatCard = ({ title, value, borderColor, icon }: StatCardProps) => {
  return (
    <Card className={cn(
      "border-l-4 shadow-md",
      `border-l-[${borderColor}]`
    )}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
};
