
import { Card, CardContent } from "@/components/ui/card";

export function RankingInfoCard() {
  return (
    <Card className="bg-muted/20">
      <CardContent className="pt-6 p-4 md:p-6">
        <div className="text-center space-y-2">
          <div className="text-sm font-medium">🔄 Atualização em Tempo Real</div>
          <div className="text-xs text-muted-foreground">
            O ranking é atualizado automaticamente a cada nova venda registrada
          </div>
          <div className="text-xs text-muted-foreground">
            Os dados são zerados automaticamente no início de cada mês
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
