
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

    return { startOfMonth, endOfMonth };
  };

  const fetchRanking = async () => {
    try {
      setLoading(true);
      
      const { startOfMonth, endOfMonth } = getCurrentMonthPeriod();

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
        throw transactionsError;
      }

      // Buscar todos os profiles dos usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        throw profilesError;
      }

      // Buscar usuários que têm apelido definido
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*');

      if (usuariosError) {
        throw usuariosError;
      }

      await processarRanking(transactions || [], profiles || [], usuarios || []);

    } catch (error) {
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
    // Procurar por "Valor: R$ XX" ou "Valor bruto: R$ XX" na descrição
    const grossValueMatch = description.match(/Valor(?:\s+bruto)?:\s*R\$\s*([\d,]+\.?\d*)/i);
    if (grossValueMatch) {
      const value = parseFloat(grossValueMatch[1].replace(',', ''));
      return isNaN(value) ? amount : value;
    }
    
    // Se não encontrar padrão específico, usar o amount da transação
    return amount;
  };

  const processarRanking = async (transactions: any[], profiles: any[], usuarios: any[]) => {
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

    // Criar lista de usuários para o ranking
    const usuariosCompletos = [];
    
    // Primeiro, adicionar usuários com vendas aprovadas no mês
    for (const userId of Object.keys(volumePorUsuario)) {
      const profile = profiles.find(p => p.id === userId);
      let usuario = usuarios.find(u => u.user_id === userId);
      
      if (!usuario && profile) {
        // Criar usuário temporário se não existir
        usuario = {
          id: `temp-${userId}`,
          user_id: userId,
          apelido: profile.name || `User${userId.slice(0, 8)}`,
          volume_total_mensal: 0,
          ultima_venda_em: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      
      if (usuario) {
        usuariosCompletos.push({
          ...usuario,
          name: profile?.name,
          email: profile?.email,
          volume_total_mensal: volumePorUsuario[userId].volume,
          ultima_venda_em: volumePorUsuario[userId].ultimaVenda
        });
      }
    }

    // Depois, adicionar usuários com apelidos mas sem vendas no mês atual
    for (const usuario of usuarios) {
      if (!volumePorUsuario[usuario.user_id]) {
        const profile = profiles.find(p => p.id === usuario.user_id);
        usuariosCompletos.push({
          ...usuario,
          name: profile?.name,
          email: profile?.email,
          volume_total_mensal: 0,
          ultima_venda_em: null
        });
      }
    }

    // Ordenar por volume total e criar ranking
    const rankingOrdenado = usuariosCompletos
      .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
      .map((usuario, index) => ({
        ...usuario,
        position: index + 1,
        is_current_user: usuario.user_id === user?.id
      }));

    // Mostrar top 10 no ranking principal
    const top10 = rankingOrdenado.slice(0, 10);
    setRanking(top10);
    
    // Buscar posição do usuário atual
    const currentUser = rankingOrdenado.find(u => u.is_current_user);
    setCurrentUserRanking(currentUser || null);
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
