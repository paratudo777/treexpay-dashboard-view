
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

      console.log('Buscando transações aprovadas do período...');

      // Buscar todas as transações aprovadas do tipo 'deposit' do mês atual
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          user_id,
          amount,
          created_at,
          description
        `)
        .eq('status', 'approved')
        .eq('type', 'deposit')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Erro ao buscar transações:', transactionsError);
        throw transactionsError;
      }

      console.log('Transações aprovadas encontradas:', transactions?.length || 0);

      // Buscar todos os profiles dos usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Erro ao buscar profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles encontrados:', profiles?.length || 0);

      await processarRanking(transactions || [], profiles || []);

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

  const extractGrossValue = (description: string, amount: number) => {
    console.log('Extraindo valor de:', { description, amount });
    
    // Se não há descrição, usar o amount diretamente
    if (!description) {
      console.log('Sem descrição, usando amount:', amount);
      return amount;
    }
    
    // Tentar extrair valor de diferentes padrões na descrição
    const patterns = [
      /Valor(?:\s+bruto)?:\s*R\$?\s*([\d.,]+)/i,
      /R\$\s*([\d.,]+)/i,
      /(\d+[.,]\d{2})/
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        // Normalizar o valor: trocar vírgula por ponto e remover pontos de milhares se necessário
        let valueStr = match[1];
        // Se tem vírgula como separador decimal
        if (valueStr.includes(',') && valueStr.indexOf(',') > valueStr.length - 4) {
          valueStr = valueStr.replace(/\./g, '').replace(',', '.');
        } else {
          // Se usa ponto como decimal ou não tem decimal
          valueStr = valueStr.replace(/,/g, '');
        }
        
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {
          console.log('Valor extraído da descrição:', value);
          return value;
        }
      }
    }
    
    console.log('Não foi possível extrair da descrição, usando amount:', amount);
    return amount;
  };

  const processarRanking = async (transactions: any[], profiles: any[]) => {
    console.log('Processando ranking com:', {
      transacoes: transactions.length,
      profiles: profiles.length
    });

    // Calcular volume por usuário baseado em transações aprovadas do mês
    const volumePorUsuario = transactions.reduce((acc, transaction) => {
      const userId = transaction.user_id;
      const grossValue = extractGrossValue(transaction.description || '', Number(transaction.amount));
      
      if (!acc[userId]) {
        acc[userId] = {
          volume: 0,
          ultimaVenda: transaction.created_at
        };
      }
      acc[userId].volume += grossValue;
      
      // Manter a data da venda mais recente
      if (new Date(transaction.created_at) > new Date(acc[userId].ultimaVenda)) {
        acc[userId].ultimaVenda = transaction.created_at;
      }
      
      return acc;
    }, {} as Record<string, { volume: number; ultimaVenda: string }>);

    console.log('Volume por usuário calculado:', volumePorUsuario);

    // Criar lista de usuários para o ranking
    const usuariosCompletos: RankingUser[] = [];
    
    // Adicionar usuários com vendas aprovadas no mês
    for (const userId of Object.keys(volumePorUsuario)) {
      const profile = profiles.find(p => p.id === userId);
      
      if (profile) {
        const userWithVolume: RankingUser = {
          id: `${userId}-ranking`,
          user_id: userId,
          apelido: profile.name || `User${userId.slice(0, 8)}`,
          name: profile.name,
          email: profile.email,
          volume_total_mensal: volumePorUsuario[userId].volume,
          ultima_venda_em: volumePorUsuario[userId].ultimaVenda,
          position: 0, // Será definido após ordenação
          is_current_user: userId === user?.id
        };
        console.log('Adicionando usuário com vendas:', userWithVolume);
        usuariosCompletos.push(userWithVolume);
      }
    }

    // Buscar usuários da tabela usuarios para completar com apelidos personalizados
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('*');

    if (!usuariosError && usuarios) {
      console.log('Usuários com apelido:', usuarios.length);
      
      // Atualizar apelidos dos usuários que já estão no ranking
      usuariosCompletos.forEach(user => {
        const usuarioCustom = usuarios.find(u => u.user_id === user.user_id);
        if (usuarioCustom && usuarioCustom.apelido) {
          user.apelido = usuarioCustom.apelido;
        }
      });

      // Adicionar usuários com apelidos personalizados mas sem vendas no mês atual
      usuarios.forEach(usuario => {
        if (!volumePorUsuario[usuario.user_id]) {
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
              position: 0, // Será definido após ordenação
              is_current_user: usuario.user_id === user?.id
            };
            console.log('Adicionando usuário sem vendas no mês:', userWithoutVolume);
            usuariosCompletos.push(userWithoutVolume);
          }
        }
      });
    }

    console.log('Total de usuários completos:', usuariosCompletos.length);

    // Ordenar por volume total e criar ranking
    const rankingOrdenado = usuariosCompletos
      .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
      .map((usuario, index) => ({
        ...usuario,
        position: index + 1
      }));

    console.log('Ranking ordenado (top 5):', rankingOrdenado.slice(0, 5));

    // Mostrar top 10 no ranking principal
    const top10 = rankingOrdenado.slice(0, 10);
    setRanking(top10);
    
    // Buscar posição do usuário atual
    const currentUser = rankingOrdenado.find(u => u.is_current_user);
    setCurrentUserRanking(currentUser || null);

    console.log('Ranking final definido:', {
      top10Count: top10.length,
      currentUser: currentUser ? `${currentUser.apelido} - Posição ${currentUser.position}` : 'Não encontrado'
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
    fetchRanking();

    // Escutar mudanças em tempo real
    const channel = supabase
      .channel('ranking-realtime')
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
          table: 'transactions'
        },
        (payload) => {
          // Atualizar apenas se for uma transação aprovada de depósito
          if (payload.new && 
              typeof payload.new === 'object' && 
              'status' in payload.new &&
              'type' in payload.new &&
              payload.new.status === 'approved' &&
              payload.new.type === 'deposit') {
            console.log('Nova transação aprovada detectada, atualizando ranking...');
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
