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
          <CreditCard className="w-5 h-5" />
          Teste de Pagamento NovaEra
        </CardTitle>
        <CardDescription>
          Execute um teste de pagamento para verificar a integração com a NovaEra
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
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            "Executar Teste"
          )}
        </Button>

        {testResult && (
          <div className="mt-4 p-4 rounded-lg bg-gray-50">
            <h3 className="font-semibold mb-2">Resultado do Teste:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
