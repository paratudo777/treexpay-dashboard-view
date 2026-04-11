
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Star } from "lucide-react";
import { RankingUser } from "@/hooks/useRanking";

interface RankingListProps {
  ranking: RankingUser[];
  loading: boolean;
}

const RANKING_SEEN_KEY = 'treexpay_ranking_seen';

function AnimatedVolume({ value, animate }: { value: number; animate: boolean }) {
  const [display, setDisplay] = useState(animate ? 0 : value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate || value === 0) {
      setDisplay(value);
      return;
    }

    const duration = 1800;
    const steps = 60;
    const stepTime = duration / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      // Ease-out cubic
      const progress = 1 - Math.pow(1 - step / steps, 3);
      current = value * progress;
      setDisplay(current);

      if (step >= steps) {
        setDisplay(value);
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, animate]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div
      ref={ref}
      className={`text-lg md:text-2xl font-bold text-primary break-all transition-all ${
        animate ? 'ranking-value-animate' : ''
      }`}
    >
      {formatCurrency(display)}
    </div>
  );
}

export function RankingList({ ranking, loading }: RankingListProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (ranking.length > 0) {
      const seen = sessionStorage.getItem(RANKING_SEEN_KEY);
      if (!seen) {
        setShouldAnimate(true);
        sessionStorage.setItem(RANKING_SEEN_KEY, 'true');
      }
    }
  }, [ranking]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-5 w-5 md:h-6 md:w-6 text-yellow-500" />;
      case 2: return <Trophy className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />;
      case 4: return <Award className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />;
      case 5: return <Star className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />;
      default: return null;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 2: return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 3: return "bg-gradient-to-r from-amber-400 to-amber-600";
      case 4: return "bg-gradient-to-r from-blue-400 to-blue-600";
      case 5: return "bg-gradient-to-r from-purple-400 to-purple-600";
      default: return "bg-gradient-to-r from-gray-400 to-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-lg md:text-xl">Ranking do Mês</CardTitle>
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
                    ? 'ring-2 ring-primary bg-primary/10' 
                    : 'bg-muted/30'
                  }
                  ${shouldAnimate ? 'animate-fade-in' : ''}
                `}
                style={shouldAnimate ? { animationDelay: `${index * 120}ms`, animationFillMode: 'both' } : undefined}
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                  <div className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0
                    ${getPositionColor(user.position)}
                  `}>
                    {getPositionIcon(user.position) || `${user.position}º`}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base md:text-lg break-all">
                        {user.apelido}
                      </span>
                      {user.is_current_user && (
                        <Badge variant="default" className="text-xs bg-primary flex-shrink-0">
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

                <div className="text-right flex-shrink-0">
                  <AnimatedVolume
                    value={user.volume_total_mensal}
                    animate={shouldAnimate && user.volume_total_mensal > 0}
                  />
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    volume mensal
                  </div>
                  {/* Green glow effect on animate */}
                  {shouldAnimate && user.volume_total_mensal > 0 && (
                    <div className="ranking-green-flash absolute inset-0 rounded-lg pointer-events-none" />
                  )}
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
  );
}
