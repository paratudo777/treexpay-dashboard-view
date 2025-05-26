
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RankingUser } from '@/types/ranking';
import { 
  fetchApprovedTransactions, 
  fetchUsuarios, 
  fetchProfiles, 
  updateUserApelido, 
  createUserIfNotExists, 
  createSaleTransaction 
} from '@/services/rankingApi';
import { 
  calculateVolumePerUser, 
  processRankingUsers 
} from '@/utils/rankingUtils';

export const useRanking = () => {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserRanking, setCurrentUserRanking] = useState<RankingUser | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const fetchRanking = async () => {
    // Não executar se ainda estiver carregando a autenticação
    if (authLoading) {
      console.log('Aguardando verificação de autenticação...');
      return;
    }

    // Se auth carregou mas não há usuário, não executar
    if (!authLoading && !user) {
      console.log('Usuário não autenticado, não carregando ranking');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const [transacoesAprovadas, usuarios, profiles] = await Promise.all([
        fetchApprovedTransactions(),
        fetchUsuarios(),
        fetchProfiles()
      ]);

      await processarRanking(transacoesAprovadas, usuarios, profiles);

    } catch (error) {
      console.error('Erro completo no ranking:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar ranking. Verifique sua conexão.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processarRanking = async (transacoes: any[], usuarios: any[], profiles: any[]) => {
    const volumePorUsuario = calculateVolumePerUser(transacoes);
    console.log('Volume por usuário calculado (mês atual):', volumePorUsuario);

    const rankingOrdenado = processRankingUsers(volumePorUsuario, usuarios, profiles, user?.id);
    console.log('Ranking final ordenado:', rankingOrdenado);

    // Mostrar top 10 no ranking principal
    const top10 = rankingOrdenado.slice(0, 10);
    setRanking(top10);
    
    // Buscar posição do usuário atual
    const currentUser = rankingOrdenado.find(u => u.is_current_user);
    setCurrentUserRanking(currentUser || null);

    if (currentUser) {
      console.log('Usuário atual encontrado:', {
        position: currentUser.position,
        apelido: currentUser.apelido,
        volume: currentUser.volume_total_mensal
      });
    } else {
      console.log('Usuário atual não encontrado no ranking');
    }
  };

  const updateApelido = async (newApelido: string) => {
    if (!user?.id) return false;

    try {
      // Validar apelido
      if (newApelido.length > 10 || !/^[A-Za-z0-9]+$/.test(newApelido)) {
        toast({
          variant: "destructive",
          title: "Apelido inválido",
          description: "Use apenas letras e números, máximo 10 caracteres.",
        });
        return false;
      }

      await updateUserApelido(user.id, newApelido);

      toast({
        title: "Sucesso",
        description: "Apelido atualizado com sucesso!",
      });

      // Forçar atualização do ranking
      await fetchRanking();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar apelido:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar apelido.",
      });
      return false;
    }
  };

  const addVenda = async (valor: number) => {
    if (!user?.id) return;

    try {
      await createUserIfNotExists(user.id, user.name || 'Usuario');
      await createSaleTransaction(user.id, valor);

      toast({
        title: "Venda registrada",
        description: `Venda de R$ ${valor.toFixed(2)} registrada com sucesso!`,
      });

      // Atualizar ranking imediatamente
      await fetchRanking();
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao registrar venda.",
      });
    }
  };

  useEffect(() => {
    // Só executar quando a autenticação não estiver mais carregando
    if (!authLoading) {
      console.log('AuthContext carregou, iniciando fetchRanking...');
      fetchRanking();
    }

    // Escutar mudanças em tempo real apenas para transações aprovadas
    const channel = supabase
      .channel('ranking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usuarios'
        },
        () => {
          console.log('Mudança detectada na tabela usuarios');
          if (!authLoading && user) {
            fetchRanking();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Mudança detectada na tabela transactions:', payload);
          // Atualizar apenas se for uma transação aprovada de depósito
          if (payload.new && 
              typeof payload.new === 'object' && 
              'status' in payload.new &&
              'type' in payload.new &&
              payload.new.status === 'approved' &&
              payload.new.type === 'deposit' &&
              !authLoading && user) {
            fetchRanking();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, user?.id]);

  return {
    ranking,
    loading: authLoading || loading,
    currentUserRanking,
    updateApelido,
    addVenda,
    refetch: fetchRanking
  };
};
