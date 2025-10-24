import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CardPaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('💳 Erro capturado no CardPaymentErrorBoundary:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('💳 Detalhes do erro:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Erro ao carregar pagamento com cartão
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Não foi possível carregar o formulário de pagamento com cartão. Por favor, use PIX ou tente novamente mais tarde.
                </p>
                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                  {this.state.error?.message || 'Erro desconhecido'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                Recarregar página
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
