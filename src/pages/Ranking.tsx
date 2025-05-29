
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Star } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";

export default function Ranking() {
  const { ranking, loading, currentUserRanking, updateApelido } = useRanking();
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
        return <Crown className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />;
      case 4:
        return <Award className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />;
      case 5:
        return <Star className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />;
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

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl space-y-6 px-2 md:px-4">
        {/* Header com título e badge - layout responsivo */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-treexpay-medium break-words">
            🏆 Ranking de Vendas
          </h1>
          <Badge variant="outline" className="text-xs md:text-sm self-start md:self-auto">
            Ranking Mensal - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </Badge>
        </div>

        {/* Sua posição no ranking */}
        {currentUserRanking && (
          <Card className="bg-treexpay-light/10 border-treexpay-medium">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">Sua Posição no Ranking</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                  {/* Posição com ícone */}
                  <div className={`
                    w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0
                    ${getPositionColor(currentUserRanking.position)}
                  `}>
                    {getPositionIcon(currentUserRanking.position) || `${currentUserRanking.position}º`}
                  </div>
                  
                  {/* Informações do usuário */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-lg md:text-xl break-all">
                        {currentUserRanking.apelido}
                      </span>
                      <Badge variant="default" className="text-xs bg-treexpay-medium flex-shrink-0">
                        você
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Posição #{currentUserRanking.position} de {ranking.length + (currentUserRanking.volume_total_mensal === 0 ? 1 : 0)}
                    </div>
                    {currentUserRanking.ultima_venda_em && (
                      <div className="text-xs text-muted-foreground">
                        Última venda: {new Date(currentUserRanking.ultima_venda_em).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Volume de vendas */}
                <div className="text-right flex-shrink-0">
                  <div className="text-xl md:text-2xl font-bold text-treexpay-medium break-all">
                    {formatCurrency(currentUserRanking.volume_total_mensal)}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    volume mensal
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campo de edição de apelido - layout mobile otimizado */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Seu Apelido no Ranking</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {!isEditing ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 min-w-0">
                  <span className="text-sm text-muted-foreground">Apelido atual:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm md:text-base break-all">
                      {currentUserRanking?.apelido || "Não definido"}
                    </span>
                    {currentUserRanking?.is_current_user && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">você</Badge>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="self-start md:self-auto flex-shrink-0"
                >
                  Editar
                </Button>
              </div>
            ) : (
              <form onSubmit={handleApelidoSubmit} className="flex flex-col gap-2 md:flex-row">
                <Input
                  value={newApelido}
                  onChange={(e) => setNewApelido(e.target.value)}
                  placeholder="Digite seu apelido (máx. 10 caracteres)"
                  maxLength={10}
                  pattern="[A-Za-z0-9]+"
                  className="flex-1 text-sm"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1 md:flex-none">
                    Salvar
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="flex-1 md:flex-none"
                    onClick={() => {
                      setIsEditing(false);
                      setNewApelido("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Apenas letras e números, máximo 10 caracteres
            </p>
          </CardContent>
        </Card>

        {/* Ranking completo - layout mobile otimizado */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Todos os Vendedores do Mês</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Carregando ranking...</div>
              </div>
            ) : ranking.length > 0 ? (
              <div className="space-y-3">
                {ranking.map((user, index) => (
                  <div
                    key={user.id}
                    className={`
                      relative rounded-lg p-3 md:p-4 flex items-center justify-between gap-3
                      ${user.is_current_user 
                        ? 'ring-2 ring-treexpay-medium bg-treexpay-light/10' 
                        : 'bg-muted/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                      {/* Posição com ícone - tamanho responsivo */}
                      <div className={`
                        w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0
                        ${getPositionColor(user.position)}
                      `}>
                        {getPositionIcon(user.position) || `${user.position}º`}
                      </div>
                      
                      {/* Informações do usuário */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base md:text-lg break-all">
                            {user.apelido}
                          </span>
                          {user.is_current_user && (
                            <Badge variant="default" className="text-xs bg-treexpay-medium flex-shrink-0">
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

                    {/* Volume de vendas - layout responsivo */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg md:text-2xl font-bold text-treexpay-medium break-all">
                        {formatCurrency(user.volume_total_mensal)}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
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
      </div>
    </DashboardLayout>
  );
}
