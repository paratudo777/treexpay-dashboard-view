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

      console.log('Buscando dados para o ranking...');

      // 1. Buscar depósitos concluídos
      const { data: deposits, error: depositsError } = await supabase
        .from('deposits')
        .select('user_id, amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (depositsError) {
        console.error('Erro ao buscar depósitos:', depositsError);
        throw depositsError;
      }
      console.log(`Encontrados ${deposits?.length || 0} depósitos concluídos.`);

      // 2. Buscar pagamentos de checkout concluídos
      const { data: checkoutPayments, error: checkoutPaymentsError } = await supabase
        .from('checkout_payments')
        .select('amount, created_at, checkouts:checkout_id ( user_id )')
        .eq('status', 'paid')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      if (checkoutPaymentsError) {
        console.error('Erro ao buscar pagamentos de checkout:', checkoutPaymentsError);
        throw checkoutPaymentsError;
      }
      console.log(`Encontrados ${checkoutPayments?.length || 0} pagamentos de checkout.`);
      
      // 3. Buscar todos os profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Erro ao buscar profiles:', profilesError);
        throw profilesError;
      }
      console.log(`Encontrados ${profiles?.length || 0} profiles.`);

      await processarRanking(deposits || [], checkoutPayments || [], profiles || []);

    } catch (error) {
      console.error('Erro completo no fetchRanking:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar ranking. Verifique sua conexão.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processarRanking = async (deposits: any[], checkoutPayments: any[], profiles: any[]) => {
    console.log('Processando ranking com:', {
      depositos: deposits.length,
      checkouts: checkoutPayments.length,
      profiles: profiles.length
    });

    // Calcular volume por usuário
    const volumePorUsuario = new Map<string, { volume: number; ultimaVenda: string }>();

    const processSale = (userId: string, amount: number, date: string) => {
      if (!userId) return;
      
      const userData = volumePorUsuario.get(userId) || { volume: 0, ultimaVenda: '1970-01-01T00:00:00Z' };
      
      userData.volume += Number(amount);
      if (new Date(date) > new Date(userData.ultimaVenda)) {
        userData.ultimaVenda = date;
      }
      volumePorUsuario.set(userId, userData);
    };

    // Processar depósitos
    deposits.forEach(dep => processSale(dep.user_id, dep.amount, dep.created_at));

    // Processar pagamentos de checkout
    checkoutPayments.forEach(cp => {
      if (cp.checkouts?.user_id) {
        processSale(cp.checkouts.user_id, cp.amount, cp.created_at);
      }
    });

    console.log('Volume por usuário calculado:', Object.fromEntries(volumePorUsuario));

    // Criar lista de usuários para o ranking
    const usuariosCompletos: RankingUser[] = [];
    
    // Adicionar usuários com vendas no mês
    for (const [userId, data] of volumePorUsuario.entries()) {
      const profile = profiles.find(p => p.id === userId);
      
      if (profile) {
        const userWithVolume: RankingUser = {
          id: `${userId}-ranking`,
          user_id: userId,
          apelido: profile.name || `User...`,
          name: profile.name,
          email: profile.email,
          volume_total_mensal: data.volume,
          ultima_venda_em: data.ultimaVenda,
          position: 0,
          is_current_user: userId === user?.id
        };
        usuariosCompletos.push(userWithVolume);
      }
    }

    // Buscar usuários da tabela usuarios para completar com apelidos personalizados
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*');

    if (!usuariosError && usuarios) {
      console.log('Encontrados usuários com apelidos:', usuarios.length);
      
      const apelidoMap = new Map(usuarios.map(u => [u.user_id, u.apelido]));
      
      // Atualizar apelidos dos usuários que já estão no ranking
      usuariosCompletos.forEach(user => {
        const customApelido = apelidoMap.get(user.user_id);
        if (customApelido) {
          user.apelido = customApelido;
        }
      });

      // Adicionar usuários com apelidos personalizados mas sem vendas no mês atual
      usuarios.forEach(usuario => {
        if (!volumePorUsuario.has(usuario.user_id)) {
          const profile = profiles.find(p => p.id === usuario.user_id);
          if (profile) {
            const userWithoutVolume: RankingUser = {
              id: usuario.id,
              user_id: usuario.user_id,
              apelido: usuario.apelido,
              name: profile.name,
              email: profile.email,
              volume_total_mensal: 0,
              ultima_venda_em: null,
              position: 0,
              is_current_user: usuario.user_id === user?.id
            };
            usuariosCompletos.push(userWithoutVolume);
          }
        }
      });
    }

    console.log('Total de usuários para rankear:', usuariosCompletos.length);

    // Ordenar por volume total e criar ranking
    const rankingOrdenado = usuariosCompletos
      .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
      .map((usuario, index) => ({
        ...usuario,
        position: index + 1
      }));

    console.log('Ranking ordenado (top 5):', rankingOrdenado.slice(0, 5).map(u => ({apelido: u.apelido, volume: u.volume_total_mensal, pos: u.position})));

    // Mostrar top 10 no ranking principal
    const top10 = rankingOrdenado.slice(0, 10);
    setRanking(top10);
    
    // Buscar posição do usuário atual
    const currentUserData = rankingOrdenado.find(u => u.is_current_user);
    setCurrentUserRanking(currentUserData || null);

    console.log('Ranking final definido:', {
      top10Count: top10.length,
      currentUser: currentUserData ? `${currentUserData.apelido} - Posição ${currentUserData.position}` : 'Não encontrado no ranking'
    });
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

    // Escutar mudanças em tempo real
    const channel = supabase
      .channel('ranking-realtime-v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usuarios'
        },
        () => {
          console.log('Mudança na tabela usuarios detectada, atualizando ranking...');
          fetchRanking();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposits',
        },
        (payload) => {
          const oldStatus = (payload.old as any)?.status;
          if (payload.new && 
              payload.new.status === 'completed' &&
              oldStatus !== 'completed'
            ) {
            console.log('Novo depósito concluído detectado, atualizando ranking...');
            fetchRanking();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_payments',
        },
        (payload) => {
          const oldStatus = (payload.old as any)?.status;
          if (payload.new && 
              payload.new.status === 'paid' &&
              oldStatus !== 'paid'
            ) {
            console.log('Novo pagamento de checkout detectado, atualizando ranking...');
            fetchRanking();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('Mudança na tabela profiles detectada, atualizando ranking...');
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
    refetch: fetchRanking
  };
};
