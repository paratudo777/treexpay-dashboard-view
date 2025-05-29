
import { Badge } from "@/components/ui/badge";

export function RankingHeader() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <h1 className="text-2xl md:text-3xl font-bold text-treexpay-medium break-words">
        🏆 Top 10 Vendedores
      </h1>
      <Badge variant="outline" className="text-xs md:text-sm self-start md:self-auto">
        Ranking Mensal - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </Badge>
    </div>
  );
}
