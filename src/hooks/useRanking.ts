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
  name?: string;
  email?: string;
}

export const useRanking = () => {
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRanking, setCurrentUserRanking] = useState<RankingUser | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    console.log('Período do mês atual:', {
      startOfMonth: startOfMonth.toISOString(),
      endOfMonth: endOfMonth.toISOString(),
      currentTime: now.toISOString()
    });

    return { startOfMonth, endOfMonth };
  };

  const fetchRanking = async () => {
    try {
      setLoading(true);
      
      const { startOfMonth, endOfMonth } = getCurrentMonthPeriod();

      console.log('Buscando ranking com a nova função otimizada...');

      // 1. Chamar a função do banco de dados para obter o ranking de forma eficiente
      const { data: rankingData, error: rankingError } = await supabase.rpc(
        'get_monthly_ranking',
        {
          p_start_date: startOfMonth.toISOString(),
          p_end_date: endOfMonth.toISOString(),
        }
      );

      if (rankingError) {
        console.error('Erro ao chamar RPC get_monthly_ranking:', rankingError);
        throw rankingError;
      }
      console.log(`Recebidos ${rankingData?.length || 0} usuários com volume.`);

      // 2. Buscar profiles e apelidos para enriquecer os dados do ranking
      const [
        { data: profiles, error: profilesError },
        { data: usuarios, error: usuariosError }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('usuarios').select('user_id, apelido')
      ]);

      if (profilesError) throw profilesError;
      if (usuariosError) throw usuariosError;
      
      // 3. Processar e combinar os dados para montar o ranking final
      await processarRanking(rankingData || [], profiles || [], usuarios || []);

    } catch (error) {
      console.error('Erro completo no fetchRanking:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar ranking. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processarRanking = async (rankingData: any[], profiles: any[], usuarios: any[]) => {
    console.log('Processando ranking com dados do RPC...');

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const apelidoMap = new Map(usuarios.map(u => [u.user_id, u.apelido]));
    const rankedUserIds = new Set(rankingData.map(r => r.user_id));

    const usuariosCompletos: RankingUser[] = [];

    // Adicionar usuários com volume (dados do RPC)
    for (const rankItem of rankingData) {
      const profile = profileMap.get(rankItem.user_id);
      if (profile) {
        const apelido = apelidoMap.get(rankItem.user_id) || profile.name || `User...`;
        
        usuariosCompletos.push({
          id: `${rankItem.user_id}-ranking`,
          user_id: rankItem.user_id,
          apelido: apelido,
          name: profile.name,
          email: profile.email,
          volume_total_mensal: rankItem.total_volume,
          ultima_venda_em: rankItem.last_sale_date,
          position: 0,
          is_current_user: rankItem.user_id === user?.id,
        });
      }
    }

    // Adicionar usuários da tabela 'usuarios' que não tiveram vendas este mês para que apareçam na lista
    for (const usuario of usuarios) {
      if (!rankedUserIds.has(usuario.user_id)) {
        const profile = profileMap.get(usuario.user_id);
        if (profile) {
            usuariosCompletos.push({
              id: `${usuario.user_id}-ranking-zero`,
              user_id: usuario.user_id,
              apelido: usuario.apelido,
              name: profile.name,
              email: profile.email,
              volume_total_mensal: 0,
              ultima_venda_em: null,
              position: 0,
              is_current_user: usuario.user_id === user?.id,
            });
        }
      }
    }

    // Ordenar por volume e atribuir posições
    const rankingOrdenado = usuariosCompletos
      .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
      .map((usuario, index) => ({
        ...usuario,
        position: index + 1
      }));

    // Definir estado do ranking (Top 10) e do usuário atual
    const top10 = rankingOrdenado.slice(0, 10);
    setRanking(top10);
    
    const currentUserData = rankingOrdenado.find(u => u.is_current_user);
    setCurrentUserRanking(currentUserData || null);
    
    console.log('Ranking final processado e definido.');
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
          .update({ 
            apelido: newApelido,
            updated_at: new Date().toISOString()
          })
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

      // Forçar atualização do ranking
      await fetchRanking();
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

  useEffect(() => {
    if (user?.id) {
        fetchRanking();
    }

    // Escutar mudanças em tempo real para manter o ranking sempre atualizado
    const channel = supabase
      .channel('ranking-realtime-v3') // Canal atualizado para evitar conflitos
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios' },
        () => {
          console.log('Mudança de apelido detectada, atualizando ranking...');
          fetchRanking();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('Mudança de perfil detectada, atualizando ranking...');
          fetchRanking();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deposits' },
        (payload) => {
          const newRecord = payload.new as { status?: string };
          const oldRecord = payload.old as { status?: string };
          if (newRecord?.status === 'completed' && oldRecord?.status !== 'completed') {
            console.log('Depósito concluído, atualizando ranking...');
            fetchRanking();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'checkout_payments' },
        (payload) => {
          const newRecord = payload.new as { status?: string };
          const oldRecord = payload.old as { status?: string };
          if (newRecord?.status === 'paid' && oldRecord?.status !== 'paid') {
            console.log('Pagamento de checkout concluído, atualizando ranking...');
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
    refetch: fetchRanking
  };
};
