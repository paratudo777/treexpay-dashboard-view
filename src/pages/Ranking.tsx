import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Star } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";
import { useAuth } from "@/contexts/AuthContext";

export default function Ranking() {
  const { ranking, loading, currentUserRanking, updateApelido } = useRanking();
  const { loading: authLoading } = useAuth();
  const [newApelido, setNewApelido] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Trophy className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      case 4:
        return <Award className="h-6 w-6 text-blue-500" />;
      case 5:
        return <Star className="h-6 w-6 text-purple-500" />;
      default:
        return null;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600";
      case 4:
        return "bg-gradient-to-r from-blue-400 to-blue-600";
      case 5:
        return "bg-gradient-to-r from-purple-400 to-purple-600";
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-600";
    }
  };

  const handleApelidoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newApelido.trim()) {
      const success = await updateApelido(newApelido.trim());
      if (success) {
        setNewApelido("");
        setIsEditing(false);
      }
    }
  };

  // Mostrar loading se ainda está verificando autenticação ou carregando ranking
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {authLoading ? "Verificando sessão..." : "Carregando ranking..."}
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-treexpay-medium">🏆 Top 5 Vendedores</h1>
          <Badge variant="outline" className="text-sm">
            Ranking Mensal - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </Badge>
        </div>

        {/* Campo de edição de apelido */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seu Apelido no Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Apelido atual:</span>
                  <span className="font-semibold">
                    {currentUserRanking?.apelido || "Não definido"}
                  </span>
                  {currentUserRanking?.is_current_user && (
                    <Badge variant="secondary" className="text-xs">você</Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                >
                  Editar
                </Button>
              </div>
            ) : (
              <form onSubmit={handleApelidoSubmit} className="flex gap-2">
                <Input
                  value={newApelido}
                  onChange={(e) => setNewApelido(e.target.value)}
                  placeholder="Digite seu apelido (máx. 10 caracteres)"
                  maxLength={10}
                  pattern="[A-Za-z0-9]+"
                  className="flex-1"
                />
                <Button type="submit" size="sm">
                  Salvar
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setNewApelido("");
                  }}
                >
                  Cancelar
                </Button>
              </form>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Apenas letras e números, máximo 10 caracteres
            </p>
          </CardContent>
        </Card>

        {/* Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Ranking do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length > 0 ? (
              <div className="space-y-3">
                {ranking.map((user, index) => (
                  <div
                    key={user.id}
                    className={`
                      relative rounded-lg p-4 flex items-center justify-between
                      ${user.is_current_user 
                        ? 'ring-2 ring-treexpay-medium bg-treexpay-light/10' 
                        : 'bg-muted/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      {/* Posição com ícone */}
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-white font-bold
                        ${getPositionColor(user.position)}
                      `}>
                        {getPositionIcon(user.position) || `${user.position}º`}
                      </div>
                      
                      {/* Informações do usuário */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">
                            {user.apelido}
                          </span>
                          {user.is_current_user && (
                            <Badge variant="default" className="text-xs bg-treexpay-medium">
                              você
                            </Badge>
                          )}
                        </div>
                        {user.ultima_venda_em && (
                          <span className="text-xs text-muted-foreground">
                            Última venda: {new Date(user.ultima_venda_em).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Volume de vendas */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-treexpay-medium">
                        {formatCurrency(user.volume_total_mensal)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        volume mensal
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-muted-foreground">
                  Nenhuma venda registrada este mês
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Seja o primeiro a aparecer no ranking!
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações do ranking */}
        <Card className="bg-muted/20">
          <CardContent className="pt-6">
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
      </div>
    </DashboardLayout>
  );
}
