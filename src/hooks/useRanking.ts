
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface RankingUser {
  id: string;
  user_id: string;
  apelido: string;
  volume_total_mensal: number;
  ultima_venda_em: string | null;
  position: number;
  is_current_user: boolean;
}

export const useRanking = () => {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRanking, setCurrentUserRanking] = useState<RankingUser | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRanking = async () => {
    try {
      setLoading(true);
      
      // Definir período do mês atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      console.log('Período do ranking:', { startOfMonth, endOfMonth });

      // Buscar todas as transações aprovadas do tipo payment no mês atual
      const { data: transacoesAprovadas, error: transacoesError } = await supabase
        .from('transactions')
        .select('user_id, amount, created_at')
        .eq('status', 'approved')
        .eq('type', 'payment')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (transacoesError) {
        console.error('Erro ao buscar transações:', transacoesError);
        throw transacoesError;
      }

      console.log('Transações aprovadas encontradas:', transacoesAprovadas?.length || 0);

      if (!transacoesAprovadas || transacoesAprovadas.length === 0) {
        setRanking([]);
        setCurrentUserRanking(null);
        return;
      }

      // Agrupar transações por usuário e calcular volume total
      const volumePorUsuario = transacoesAprovadas.reduce((acc, transacao) => {
        const userId = transacao.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            volume: 0,
            ultimaVenda: transacao.created_at
          };
        }
        acc[userId].volume += Number(transacao.amount);
        
        // Manter a data da venda mais recente
        if (new Date(transacao.created_at) > new Date(acc[userId].ultimaVenda)) {
          acc[userId].ultimaVenda = transacao.created_at;
        }
        
        return acc;
      }, {} as Record<string, { volume: number; ultimaVenda: string }>);

      console.log('Volume por usuário:', volumePorUsuario);

      // Buscar dados dos usuários que têm vendas
      const userIds = Object.keys(volumePorUsuario);
      
      if (userIds.length === 0) {
        setRanking([]);
        setCurrentUserRanking(null);
        return;
      }

      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .in('user_id', userIds);

      if (usuariosError) {
        console.error('Erro ao buscar usuários:', usuariosError);
        throw usuariosError;
      }

      console.log('Usuários encontrados:', usuarios?.length || 0);

      // Para usuários que não existem na tabela usuarios, criar dados temporários
      const usuariosCompletos = [];
      
      for (const userId of userIds) {
        let usuario = usuarios?.find(u => u.user_id === userId);
        
        if (!usuario) {
          // Buscar dados do perfil para usuários não cadastrados na tabela usuarios
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', userId)
            .single();
          
          usuario = {
            id: `temp-${userId}`,
            user_id: userId,
            apelido: profile?.name || `Usuario${userId.slice(0, 4)}`,
            volume_total_mensal: 0,
            ultima_venda_em: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        
        usuariosCompletos.push({
          ...usuario,
          volume_total_mensal: volumePorUsuario[userId].volume,
          ultima_venda_em: volumePorUsuario[userId].ultimaVenda
        });
      }

      // Ordenar por volume total e criar ranking
      const rankingOrdenado = usuariosCompletos
        .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
        .slice(0, 10) // Mostrar top 10 em vez de apenas 5
        .map((usuario, index) => ({
          ...usuario,
          position: index + 1,
          is_current_user: usuario.user_id === user?.id
        }));

      console.log('Ranking final:', rankingOrdenado);

      setRanking(rankingOrdenado);
      
      // Buscar posição do usuário atual (mesmo se não estiver no top 10)
      const currentUser = rankingOrdenado.find(u => u.is_current_user);
      
      if (!currentUser && user?.id && volumePorUsuario[user.id]) {
        // Se o usuário atual não está no top 10 mas tem vendas, calcular sua posição
        const userVolume = volumePorUsuario[user.id].volume;
        const posicaoAtual = usuariosCompletos
          .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
          .findIndex(u => u.user_id === user.id) + 1;
        
        const usuarioAtual = usuariosCompletos.find(u => u.user_id === user.id);
        
        if (usuarioAtual) {
          setCurrentUserRanking({
            ...usuarioAtual,
            position: posicaoAtual,
            is_current_user: true,
            volume_total_mensal: userVolume,
            ultima_venda_em: volumePorUsuario[user.id].ultimaVenda
          });
        }
      } else {
        setCurrentUserRanking(currentUser || null);
      }

    } catch (error) {
      console.error('Erro completo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar ranking.",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateApelido = async (newApelido: string) => {
    if (!user?.id) return;

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

      // Verificar se o usuário já existe na tabela usuarios
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingUser) {
        // Atualizar apelido existente
        const { error } = await supabase
          .from('usuarios')
          .update({ apelido: newApelido })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Criar novo registro de usuário
        const { error } = await supabase
          .from('usuarios')
          .insert({
            user_id: user.id,
            apelido: newApelido,
            volume_total_mensal: 0
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Apelido atualizado com sucesso!",
      });

      fetchRanking();
      return true;
    } catch (error) {
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
      // Verificar se o usuário existe na tabela usuarios
      let { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!usuario) {
        // Criar usuário se não existir
        const { data: newUsuario, error: createError } = await supabase
          .from('usuarios')
          .insert({
            user_id: user.id,
            apelido: user.name || 'Usuario',
            volume_total_mensal: 0
          })
          .select('id')
          .single();

        if (createError) throw createError;
        usuario = newUsuario;
      }

      // Criar transação de venda aprovada
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'payment',
          amount: valor,
          status: 'approved',
          description: 'Venda registrada',
          code: `SALE${Date.now()}`
        });

      if (error) throw error;

      toast({
        title: "Venda registrada",
        description: `Venda de R$ ${valor.toFixed(2)} registrada com sucesso!`,
      });

      fetchRanking();
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
    fetchRanking();

    // Escutar mudanças em tempo real nas transações
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
          fetchRanking();
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
          // Apenas atualizar se for uma transação de pagamento aprovada
          if (payload.new && 
              typeof payload.new === 'object' && 
              'type' in payload.new && 
              'status' in payload.new &&
              payload.new.type === 'payment' && 
              payload.new.status === 'approved') {
            fetchRanking();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    ranking,
    loading,
    currentUserRanking,
    updateApelido,
    addVenda,
    refetch: fetchRanking
  };
};
