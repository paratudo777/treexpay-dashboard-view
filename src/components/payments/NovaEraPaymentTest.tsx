import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader, CreditCard } from "lucide-react";

export const NovaEraPaymentTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  const runPaymentTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      console.log('Iniciando teste de pagamento NovaEra...');
      const {
        data,
        error
      } = await supabase.functions.invoke('novaera-payment-test');
      if (error) {
        throw error;
      }
      setTestResult(data);
      if (data.success) {
        if (data.transaction?.data?.status === 'approved') {
          toast({
            title: "Pagamento aprovado!",
            description: "Transação de teste processada com sucesso."
          });
        } else {
          toast({
            title: `Status: ${data.transaction?.data?.status || 'indefinido'}`,
            description: "Transação de teste processada.",
            variant: "destructive"
          });
        }
      } else {
        if (data.message === 'API indisponível') {
          toast({
            title: "API indisponível",
            description: "A API NovaEra está temporariamente indisponível.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro no teste",
            description: data.error || "Erro desconhecido no teste de pagamento.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Erro no teste de pagamento:', error);
      toast({
        title: "Erro interno",
        description: "Erro ao executar teste de pagamento.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Teste NovaEra
        </CardTitle>
        <CardDescription>
          Teste de integração com o sistema de pagamento NovaEra
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runPaymentTest} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Processando teste...
            </>
          ) : (
            "Executar Teste de Pagamento"
          )}
        </Button>

        {testResult && (
          <div className="mt-4 p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Resultado do Teste:</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
            
            {testResult.transaction?.data && (
              <div className="mt-3 space-y-2">
                <p><strong>Status:</strong> {testResult.transaction.data.status}</p>
                <p><strong>ID:</strong> {testResult.transaction.data.id}</p>
                {testResult.transaction.data.amount && (
                  <p><strong>Valor:</strong> {formatAmount(testResult.transaction.data.amount)}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
