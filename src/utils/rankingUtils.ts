
import { VolumeData, ProcessedUser, RankingUser } from '@/types/ranking';

export const getCurrentMonthPeriod = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { startOfMonth, endOfMonth };
};

export const extractGrossValue = (description: string, amount: number) => {
  // Procurar por "Valor: R$ XX" ou "Valor bruto: R$ XX" na descrição
  const grossValueMatch = description.match(/Valor(?:\s+bruto)?:\s*R\$\s*([\d,]+\.?\d*)/i);
  if (grossValueMatch) {
    const value = parseFloat(grossValueMatch[1].replace(',', ''));
    return isNaN(value) ? amount : value;
  }
  
  // Se não encontrar padrão específico, usar o amount da transação
  return amount;
};

export const calculateVolumePerUser = (transacoes: any[]) => {
  return transacoes.reduce((acc, transacao) => {
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
  }, {} as Record<string, VolumeData>);
};

export const processRankingUsers = (
  volumePorUsuario: Record<string, VolumeData>, 
  usuarios: any[], 
  profiles: any[], 
  currentUserId?: string
): RankingUser[] => {
  const usuariosCompletos: ProcessedUser[] = [];
  
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

  // Ordenar por volume total e criar ranking
  return usuariosCompletos
    .sort((a, b) => b.volume_total_mensal - a.volume_total_mensal)
    .map((usuario, index) => ({
      ...usuario,
      position: index + 1,
      is_current_user: usuario.user_id === currentUserId
    }));
};
