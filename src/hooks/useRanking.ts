
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
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('volume_total_mensal', { ascending: false })
        .limit(5);

      if (error) throw error;

      const rankingData = data.map((usuario, index) => ({
        ...usuario,
        position: index + 1,
        is_current_user: usuario.user_id === user?.id
      }));

      setRanking(rankingData);
      
      const currentUser = rankingData.find(u => u.is_current_user);
      setCurrentUserRanking(currentUser || null);

    } catch (error) {
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

      // Adicionar venda
      const { error } = await supabase
        .from('vendas')
        .insert({
          usuario_id: usuario.id,
          valor: valor,
          data: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Venda registrada",
        description: `Venda de R$ ${valor.toFixed(2)} registrada com sucesso!`,
      });

      fetchRanking();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao registrar venda.",
      });
    }
  };

  useEffect(() => {
    fetchRanking();

    // Escutar mudanças em tempo real
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
          table: 'vendas'
        },
        () => {
          fetchRanking();
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
