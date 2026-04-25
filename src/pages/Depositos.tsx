import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PixDepositWithProfile } from "@/components/payments/PixDepositWithProfile";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Depositos() {
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerifyDeposits = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-bestfy-payment', {
        body: {},
      });
      if (error) throw error;
      const paid = (data?.results || []).filter((r: any) => r.action === 'marked_paid').length;
      const failed = (data?.results || []).filter((r: any) => r.action === 'marked_failed').length;
      const stillPending = (data?.results || []).filter((r: any) => r.action === 'still_pending').length;
      toast({
        title: 'Verificação concluída',
        description: `Depósitos verificados: ${data?.checked_deposits || 0} • Aprovados: ${paid} • Falhou: ${failed} • Aguardando: ${stillPending}`,
      });
      if (paid > 0) setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast({ title: 'Erro ao verificar', description: e.message || 'Falha', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-2xl space-y-6 px-1 sm:px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Depósitos</h1>
          <Button variant="outline" size="sm" onClick={handleVerifyDeposits} disabled={verifying}>
            <RefreshCw className={cn("h-4 w-4 mr-2", verifying && "animate-spin")} />
            {verifying ? 'Verificando...' : 'Verificar pagamento'}
          </Button>
        </div>
        
        {/* PIX Deposit with Profile Completion */}
        <PixDepositWithProfile />
      </div>
    </DashboardLayout>
  );
}
