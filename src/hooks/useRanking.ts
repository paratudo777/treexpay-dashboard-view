
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
      
      // Buscar todos os usuários primeiro
      const { data: allUsers, error: usersError } = await supabase
        .from('usuarios')
        .select('*');

      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
        throw usersError;
      }

      if (!allUsers || allUsers.length === 0) {
        setRanking([]);
        setCurrentUserRanking(null);
        return;
      }

      // Calcular volume real baseado em transações aprovadas do mês atual
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const startOfNextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();

      const rankingWithCalculatedVolume = await Promise.all(
        allUsers.map(async (usuario) => {
          // Buscar transações aprovadas do usuário no mês atual
          // Usando 'payment' como tipo de transação para vendas
          const { data: transacoesAprovadas, error: transacoesError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', usuario.user_id)
            .eq('status', 'approved')
            .eq('type', 'payment')
            .gte('created_at', startOfMonth)
            .lt('created_at', startOfNextMonth);

          if (transacoesError) {
            console.error('Erro ao buscar transações:', transacoesError);
            return {
              ...usuario,
              volume_total_mensal: 0
            };
          }

          const volumeReal = transacoesAprovadas?.reduce((total, transacao) => total + Number(transacao.amount), 0) || 0;
          
          return {
            ...usuario,
            volume_total_mensal: volumeReal
          };
        })
      );

      // Ordenar por volume real e filtrar apenas quem tem vendas
      const rankingFiltrado = rankingWithCalculatedVolume
        .filter(usuario => usuario.volume_total_mensal > 0)
        .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
        .slice(0, 5);

      const rankingData = rankingFiltrado.map((usuario, index) => ({
        ...usuario,
        position: index + 1,
        is_current_user: usuario.user_id === user?.id
      }));

      setRanking(rankingData);
      
      const currentUser = rankingData.find(u => u.is_current_user);
      setCurrentUserRanking(currentUser || null);

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

      // Criar transação de venda aprovada usando tipo 'payment'
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
