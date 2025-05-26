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

      console.log('Período do ranking:', { 
        startOfMonth: startOfMonth.toISOString(), 
        endOfMonth: endOfMonth.toISOString(),
        currentDate: new Date().toISOString()
      });

      // Buscar APENAS transações aprovadas do tipo 'deposit' do mês atual
      const { data: transacoesAprovadas, error: transacoesError } = await supabase
        .from('transactions')
        .select('user_id, amount, created_at, type, status, code, description')
        .eq('status', 'approved')
        .eq('type', 'deposit')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
        .order('created_at', { ascending: false });

      if (transacoesError) {
        console.error('Erro ao buscar transações:', transacoesError);
        throw transacoesError;
      }

      console.log('Transações aprovadas do mês encontradas:', transacoesAprovadas?.length || 0);

      // Buscar usuários que têm apelido definido
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*');

      if (usuariosError) {
        console.error('Erro ao buscar usuários:', usuariosError);
      }

      // Buscar perfis dos usuários
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email');

      await processarRanking(transacoesAprovadas || [], usuarios || [], profiles || []);

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

  const processarRanking = async (transacoes: any[], usuarios: any[], profiles: any[]) => {
    // Calcular volume por usuário baseado APENAS em transações aprovadas do mês
    const volumePorUsuario = transacoes.reduce((acc, transacao) => {
      const userId = transacao.user_id;
      const grossValue = extractGrossValue(transacao.description || '', Number(transacao.amount));
      
      if (!acc[userId]) {
        acc[userId] = {
          volume: 0,
          ultimaVenda: transacao.created_at
        };
      }
      acc[userId].volume += grossValue;
      
      // Manter a data da venda mais recente
      if (new Date(transacao.created_at) > new Date(acc[userId].ultimaVenda)) {
        acc[userId].ultimaVenda = transacao.created_at;
      }
      
      return acc;
    }, {} as Record<string, { volume: number; ultimaVenda: string }>);

    console.log('Volume por usuário calculado (mês atual):', volumePorUsuario);

    // Criar lista de usuários para o ranking
    const usuariosCompletos = [];
    
    // Primeiro, adicionar usuários com vendas aprovadas no mês
    for (const userId of Object.keys(volumePorUsuario)) {
      let usuario = usuarios.find(u => u.user_id === userId);
      const profile = profiles.find(p => p.id === userId);
      
      if (!usuario) {
        // Criar usuário temporário se não existir
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

    // Depois, adicionar usuários com apelidos mas sem vendas no mês atual
    for (const usuario of usuarios) {
      if (!volumePorUsuario[usuario.user_id]) {
        usuariosCompletos.push({
          ...usuario,
          volume_total_mensal: 0,
          ultima_venda_em: null
        });
      }
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

      // Criar transação de depósito aprovado
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: valor,
          status: 'approved',
          description: `Depósito PIX - Valor: R$ ${valor.toFixed(2)}`,
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
