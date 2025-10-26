
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

      console.log('Buscando ranking com a função otimizada...');

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

      // 2. Buscar profiles e dados de ranking para enriquecer os dados
      const [
        { data: profiles, error: profilesError },
        { data: rankingUsers, error: rankingUsersError }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('ranking').select('user_id, apelido, volume_total_mensal, ultima_venda_em')
      ]);

      if (profilesError) throw profilesError;
      if (rankingUsersError) throw rankingUsersError;
      
      // 3. Processar e combinar os dados para montar o ranking final
      await processarRanking(rankingData || [], profiles || [], rankingUsers || []);

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

  const processarRanking = async (rankingData: any[], profiles: any[], rankingUsers: any[]) => {
    console.log('🔄 Processando ranking...');
    console.log(`Vendas calculadas: ${rankingData?.length || 0}, Perfis: ${profiles?.length || 0}, Ranking DB: ${rankingUsers?.length || 0}`);

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const rankingDbMap = new Map(rankingUsers.map(u => [u.user_id, u]));
    const vendasReaisMap = new Map(rankingData.map(r => [r.user_id, r]));

    const userMap = new Map<string, RankingUser>();

    // Processar todos os usuários da tabela ranking
    for (const rankingUser of rankingUsers) {
        const profile = profileMap.get(rankingUser.user_id);
        const vendasReais = vendasReaisMap.get(rankingUser.user_id);
        
        // Se há volume manual editado pelo admin (> 0), use-o
        // Caso contrário, use o volume calculado das vendas reais
        const volumeManual = rankingUser.volume_total_mensal || 0;
        const volumeReal = vendasReais?.total_volume || 0;
        
        // Priorizar volume manual se existir, senão usar vendas reais
        const volumeFinal = volumeManual > 0 ? volumeManual : volumeReal;
        const ultimaVendaFinal = volumeManual > 0 
          ? rankingUser.ultima_venda_em 
          : (vendasReais?.last_sale_date || null);
        
        console.log(`👤 ${rankingUser.apelido}: Manual=${volumeManual}, Real=${volumeReal}, Final=${volumeFinal}`);
        
        userMap.set(rankingUser.user_id, {
            id: `${rankingUser.user_id}-ranking`,
            user_id: rankingUser.user_id,
            apelido: rankingUser.apelido || profile?.name || `User${rankingUser.user_id.substring(0,4)}`,
            name: profile?.name,
            email: profile?.email,
            volume_total_mensal: volumeFinal,
            ultima_venda_em: ultimaVendaFinal,
            position: 0,
            is_current_user: rankingUser.user_id === user?.id,
        });
    }

    // Adicionar usuários com vendas que não estão na tabela ranking ainda
    for (const venda of rankingData) {
        if (!venda.user_id || userMap.has(venda.user_id)) continue;

        const profile = profileMap.get(venda.user_id);
        console.log(`➕ Novo usuário com vendas: ${profile?.name || venda.user_id.substring(0,4)}`);
        
        userMap.set(venda.user_id, {
            id: `${venda.user_id}-new`,
            user_id: venda.user_id,
            apelido: profile?.name || `User${venda.user_id.substring(0,4)}`,
            name: profile?.name,
            email: profile?.email,
            volume_total_mensal: venda.total_volume,
            ultima_venda_em: venda.last_sale_date,
            position: 0,
            is_current_user: venda.user_id === user?.id,
        });
    }
    
    const usuariosCompletos = Array.from(userMap.values());

    const rankingOrdenado = usuariosCompletos
      .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
      .map((usuario, index) => ({
        ...usuario,
        position: index + 1
      }));

    const top10 = rankingOrdenado.slice(0, 10);
    setRanking(top10);
    
    let currentUserData = rankingOrdenado.find(u => u.is_current_user);
    
    if (!currentUserData && user) {
        const userProfile = profileMap.get(user.id);
        console.log("Usuário logado não encontrado no ranking. Criando entrada placeholder.");
        currentUserData = {
            id: `${user.id}-placeholder`,
            user_id: user.id,
            apelido: "Defina seu apelido",
            name: userProfile?.name,
            email: userProfile?.email,
            volume_total_mensal: 0,
            ultima_venda_em: null,
            position: rankingOrdenado.length + 1,
            is_current_user: true,
        };
    }
    
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

      // Verificar se o usuário já existe na tabela ranking
      const { data: existingUser } = await supabase
        .from('ranking')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingUser) {
        // Atualizar apelido existente
        const { error } = await supabase
          .from('ranking')
          .update({ 
            apelido: newApelido,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Criar novo registro de usuário
        const { error } = await supabase
          .from('ranking')
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
      .channel('ranking-realtime-v4') // Canal atualizado para evitar conflitos
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ranking' },
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
