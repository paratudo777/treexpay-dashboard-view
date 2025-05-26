
import { supabase } from '@/integrations/supabase/client';
import { getCurrentMonthPeriod } from '@/utils/rankingUtils';

export const fetchApprovedTransactions = async () => {
  const { startOfMonth, endOfMonth } = getCurrentMonthPeriod();

  console.log('Período do ranking:', { 
    startOfMonth: startOfMonth.toISOString(), 
    endOfMonth: endOfMonth.toISOString(),
    currentDate: new Date().toISOString()
  });

  const { data, error } = await supabase
    .from('transactions')
    .select('user_id, amount, created_at, type, status, code, description')
    .eq('status', 'approved')
    .eq('type', 'deposit')
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar transações:', error);
    throw error;
  }

  console.log('Transações aprovadas do mês encontradas:', data?.length || 0);
  return data || [];
};

export const fetchUsuarios = async () => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*');

  if (error) {
    console.error('Erro ao buscar usuários:', error);
  }

  return data || [];
};

export const fetchProfiles = async () => {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, email');

  return data || [];
};

export const updateUserApelido = async (userId: string, newApelido: string) => {
  // Verificar se o usuário já existe na tabela usuarios
  const { data: existingUser } = await supabase
    .from('usuarios')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingUser) {
    // Atualizar apelido existente
    const { error } = await supabase
      .from('usuarios')
      .update({ 
        apelido: newApelido,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
  } else {
    // Criar novo registro de usuário
    const { error } = await supabase
      .from('usuarios')
      .insert({
        user_id: userId,
        apelido: newApelido,
        volume_total_mensal: 0
      });

    if (error) throw error;
  }
};

export const createUserIfNotExists = async (userId: string, userName: string) => {
  let { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!usuario) {
    const { data: newUsuario, error: createError } = await supabase
      .from('usuarios')
      .insert({
        user_id: userId,
        apelido: userName || 'Usuario',
        volume_total_mensal: 0
      })
      .select('id')
      .single();

    if (createError) throw createError;
    usuario = newUsuario;
  }

  return usuario;
};

export const createSaleTransaction = async (userId: string, valor: number) => {
  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'deposit',
      amount: valor,
      status: 'approved',
      description: `Depósito PIX - Valor: R$ ${valor.toFixed(2)}`,
      code: `SALE${Date.now()}`
    });

  if (error) throw error;
};
