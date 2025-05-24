
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
      
      const { data, error } = await supabase.functions.invoke('novaera-payment-test');

      if (error) {
        throw error;
      }

      setTestResult(data);

      if (data.success) {
        if (data.transaction?.data?.status === 'approved') {
          toast({
            title: "Pagamento aprovado!",
            description: "Transação de teste processada com sucesso.",
          });
        } else {
          toast({
            title: `Status: ${data.transaction?.data?.status || 'indefinido'}`,
            description: "Transação de teste processada.",
            variant: "destructive",
          });
        }
      } else {
        if (data.message === 'API offline') {
          toast({
            title: "API offline",
            description: "A API NovaEra está temporariamente indisponível.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no teste",
            description: data.error || "Erro desconhecido no teste de pagamento.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Erro no teste de pagamento:', error);
      toast({
        title: "Erro interno",
        description: "Erro ao executar teste de pagamento.",
        variant: "destructive",
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
          Teste NovaEra - Sandbox
        </CardTitle>
        <CardDescription>
          Execute um teste completo da integração com a API NovaEra usando dados de sandbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-4">
          <h4 className="font-medium text-yellow-500 mb-2">Dados de Teste</h4>
          <div className="text-sm space-y-1">
            <p><strong>Cartão:</strong> 4111 1111 1111 1111</p>
            <p><strong>Nome:</strong> JOAO DA SILVA</p>
            <p><strong>Validade:</strong> 12/2030</p>
            <p><strong>CVV:</strong> 123</p>
            <p><strong>Valor:</strong> {formatAmount(1000)}</p>
          </div>
        </div>

        <Button 
          onClick={runPaymentTest} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Executando teste...
            </>
          ) : (
            "Executar Teste de Pagamento"
          )}
        </Button>

        {testResult && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Resultado do Teste:</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
