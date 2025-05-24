
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";

export function FeesTab() {
  const { settings } = useProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas Taxas</CardTitle>
        <CardDescription>Taxas aplicadas às suas transações</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="font-medium">Taxa de Depósito</span>
            <span className="text-treexpay-medium">
              {settings?.deposit_fee ? `${settings.deposit_fee}%` : '1.99%'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="font-medium">Taxa de Saque</span>
            <span className="text-treexpay-medium">
              {settings?.withdrawal_fee ? `${settings.withdrawal_fee}%` : '2.50%'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
