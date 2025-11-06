import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, Edit, Trash2, Power, PowerOff, Copy, Package, Mail } from 'lucide-react';
import { useCheckouts } from '@/hooks/useCheckouts';
import { CreateCheckoutModal } from '@/components/checkout/CreateCheckoutModal';
import { EditCheckoutModal } from '@/components/checkout/EditCheckoutModal';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function Checkouts() {
  const { checkouts, loading, toggleCheckoutStatus, deleteCheckout } = useCheckouts();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<any>(null);
  const { toast } = useToast();

  const isLimitReached = checkouts.length >= 5;

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
            <h1 className="text-3xl font-bold text-foreground">Meus Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie seus produtos de checkout ({checkouts.length}/5)
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    disabled={isLimitReached}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </div>
              </TooltipTrigger>
              {isLimitReached && (
                <TooltipContent>
                  <p>Limite de 5 produtos atingido</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                <Card key={checkout.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row gap-0">
                    {/* Imagem do produto */}
                    <div className="md:w-48 w-full h-48 md:h-auto flex-shrink-0 bg-muted relative overflow-hidden">
                      {checkout.image_url ? (
                        <img 
                          src={checkout.image_url} 
                          alt={checkout.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect width="18" height="18" x="3" y="3" rx="2" ry="2"/%3E%3Ccircle cx="9" cy="9" r="2"/%3E%3Cpath d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/%3E%3C/svg%3E';
                            e.currentTarget.classList.add('p-12', 'opacity-20');
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Package className="w-12 h-12 text-muted-foreground opacity-20" />
                        </div>
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        {/* Informações principais */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <CardTitle className="text-xl mb-2 flex items-center gap-2 flex-wrap">
                                {checkout.title}
                                <Badge 
                                  variant={checkout.active ? "default" : "secondary"}
                                  className={cn(
                                    "text-xs font-semibold",
                                    checkout.active && "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                  )}
                                >
                                  {checkout.active ? "● Ativo" : "○ Inativo"}
                                </Badge>
                              </CardTitle>
                              <div className="text-2xl font-bold text-primary mb-2">
                                {formatCurrency(checkout.amount)}
                              </div>
                              {checkout.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                  {checkout.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Metadados */}
                          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                            <p className="font-mono">/checkout/{checkout.url_slug}</p>
                            {checkout.notification_email && (
                              <p className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {checkout.notification_email}
                              </p>
                            )}
                            <p>Criado em {new Date(checkout.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex md:flex-col gap-2 flex-wrap">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyCheckoutUrl(checkout.url_slug)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copiar URL</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`/checkout/${checkout.url_slug}`, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver página pública</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingCheckout(checkout)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
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
                                </TooltipTrigger>
                                <TooltipContent>
                                  {checkout.active ? 'Desativar' : 'Ativar'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(checkout.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Deletar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    </div>
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
