
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, Edit, Trash2, Power, PowerOff, Copy } from 'lucide-react';
import { useCheckouts } from '@/hooks/useCheckouts';
import { CreateCheckoutModal } from '@/components/checkout/CreateCheckoutModal';
import { EditCheckoutModal } from '@/components/checkout/EditCheckoutModal';
import { useToast } from '@/hooks/use-toast';

export default function Checkouts() {
  const { checkouts, loading, toggleCheckoutStatus, deleteCheckout } = useCheckouts();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<any>(null);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const copyCheckoutUrl = (slug: string) => {
    const url = `${window.location.origin}/checkout/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copiada",
      description: "URL do checkout copiada para a área de transferência!",
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este checkout?')) {
      await deleteCheckout(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Checkouts</h1>
            <p className="text-muted-foreground">
              Gerencie seus links de pagamento
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Checkout
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {checkouts.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">
                    Nenhum checkout criado ainda. Crie seu primeiro checkout!
                  </p>
                </CardContent>
              </Card>
            ) : (
              checkouts.map((checkout) => (
                <Card key={checkout.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {checkout.title}
                          <Badge variant={checkout.active ? "default" : "secondary"}>
                            {checkout.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {formatCurrency(checkout.amount)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCheckoutUrl(checkout.url_slug)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/checkout/${checkout.url_slug}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCheckout(checkout)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCheckoutStatus(checkout.id, !checkout.active)}
                        >
                          {checkout.active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(checkout.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>URL: /checkout/{checkout.url_slug}</p>
                      <p>Criado em: {new Date(checkout.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {showCreateModal && (
          <CreateCheckoutModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />
        )}

        {editingCheckout && (
          <EditCheckoutModal
            checkout={editingCheckout}
            open={!!editingCheckout}
            onClose={() => setEditingCheckout(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
