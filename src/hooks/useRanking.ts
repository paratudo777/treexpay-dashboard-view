
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
      
      // Calcular período do mês atual de forma mais precisa
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      // Primeiro dia do mês atual às 00:00:00
      const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
      // Último dia do mês atual às 23:59:59
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

      console.log('Período do ranking (corrigido):', { 
        startOfMonth: startOfMonth.toISOString(), 
        endOfMonth: endOfMonth.toISOString(),
        currentDate: now.toISOString()
      });

      // Buscar TODAS as transações aprovadas no período, incluindo diferentes tipos
      const { data: transacoesAprovadas, error: transacoesError } = await supabase
        .from('transactions')
        .select('user_id, amount, created_at, type, status, code')
        .eq('status', 'approved')
        .or('type.eq.payment,type.eq.sale') // Aceitar tanto payment quanto sale
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: false });

      if (transacoesError) {
        console.error('Erro ao buscar transações:', transacoesError);
        throw transacoesError;
      }

      console.log('Transações aprovadas encontradas:', transacoesAprovadas?.length || 0);
      console.log('Detalhes das transações:', transacoesAprovadas);

      // Se não há transações, verificar se há dados na tabela de vendas antigas
      if (!transacoesAprovadas || transacoesAprovadas.length === 0) {
        console.log('Verificando tabela de vendas antigas...');
        
        const { data: vendasAntigas, error: vendasError } = await supabase
          .from('vendas')
          .select('usuario_id, valor, data')
          .gte('data', startOfMonth.toISOString())
          .lte('data', endOfMonth.toISOString());

        if (vendasError) {
          console.error('Erro ao buscar vendas:', vendasError);
        } else {
          console.log('Vendas antigas encontradas:', vendasAntigas?.length || 0);
          
          if (vendasAntigas && vendasAntigas.length > 0) {
            // Converter vendas antigas para formato de transações
            const transacoesConvertidas = vendasAntigas.map(venda => ({
              user_id: venda.usuario_id,
              amount: venda.valor,
              created_at: venda.data
            }));
            
            return processarRanking(transacoesConvertidas);
          }
        }
        
        setRanking([]);
        setCurrentUserRanking(null);
        return;
      }

      await processarRanking(transacoesAprovadas);

    } catch (error) {
      console.error('Erro completo no ranking:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar ranking. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processarRanking = async (transacoes: any[]) => {
    // Agrupar transações por usuário e calcular volume total
    const volumePorUsuario = transacoes.reduce((acc, transacao) => {
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

    console.log('Volume por usuário calculado:', volumePorUsuario);

    // Buscar dados dos usuários que têm vendas
    const userIds = Object.keys(volumePorUsuario);
    
    if (userIds.length === 0) {
      setRanking([]);
      setCurrentUserRanking(null);
      return;
    }

    // Buscar dados dos usuários na tabela usuarios
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('*')
      .in('user_id', userIds);

    console.log('Usuários encontrados na tabela usuarios:', usuarios?.length || 0);

    // Buscar dados dos perfis para todos os usuários
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);

    console.log('Perfis encontrados:', profiles?.length || 0);

    // Criar lista completa de usuários com dados de vendas
    const usuariosCompletos = [];
    
    for (const userId of userIds) {
      let usuario = usuarios?.find(u => u.user_id === userId);
      const profile = profiles?.find(p => p.id === userId);
      
      if (!usuario) {
        // Criar usuário temporário se não existir na tabela usuarios
        usuario = {
          id: `temp-${userId}`,
          user_id: userId,
          apelido: profile?.name || `User${userId.slice(0, 8)}`,
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

    console.log('Usuários completos para ranking:', usuariosCompletos.length);

    // Ordenar por volume total e criar ranking
    const rankingOrdenado = usuariosCompletos
      .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
      .map((usuario, index) => ({
        ...usuario,
        position: index + 1,
        is_current_user: usuario.user_id === user?.id
      }));

    console.log('Ranking final ordenado:', rankingOrdenado);

    // Mostrar top 10 no ranking principal
    const top10 = rankingOrdenado.slice(0, 10);
    setRanking(top10);
    
    // Buscar posição do usuário atual
    const currentUser = rankingOrdenado.find(u => u.is_current_user);
    setCurrentUserRanking(currentUser || null);

    if (currentUser) {
      console.log('Usuário atual encontrado no ranking:', {
        position: currentUser.position,
        apelido: currentUser.apelido,
        volume: currentUser.volume_total_mensal
      });
    } else {
      console.log('Usuário atual não encontrado no ranking');
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
          console.log('Mudança detectada na tabela usuarios');
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
          console.log('Mudança detectada na tabela transactions:', payload);
          // Atualizar se for uma transação aprovada relevante
          if (payload.new && 
              typeof payload.new === 'object' && 
              'status' in payload.new &&
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
