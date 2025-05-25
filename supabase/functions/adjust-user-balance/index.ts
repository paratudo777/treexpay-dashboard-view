
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user_id, admin_id, amount, reason } = await req.json();

    if (!user_id || !admin_id || amount === undefined) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Adjusting balance for user:', user_id, 'by admin:', admin_id, 'amount:', amount);

    // Verificar se o admin existe e tem permissão
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('profile')
      .eq('id', admin_id)
      .single();

    if (adminError || !adminProfile) {
      console.error('Admin not found:', adminError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Administrador não encontrado' 
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (adminProfile.profile !== 'admin') {
      console.error('User is not admin:', admin_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Apenas administradores podem ajustar saldos' 
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verificar se o usuário existe
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, balance')
      .eq('id', user_id)
      .single();

    if (userError || !userProfile) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Usuário não encontrado' 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calcular novo saldo
    const currentBalance = parseFloat(userProfile.balance) || 0;
    const newBalance = currentBalance + parseFloat(amount);

    console.log('Current balance:', currentBalance, 'Adjustment:', amount, 'New balance:', newBalance);

    // Atualizar o saldo do usuário
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating balance:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao atualizar saldo do usuário' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Registrar o ajuste no histórico
    const { error: historyError } = await supabase
      .from('balance_adjustments')
      .insert({
        user_id: user_id,
        admin_id: admin_id,
        amount: parseFloat(amount),
        reason: reason || null
      });

    if (historyError) {
      console.error('Error recording adjustment history:', historyError);
      // Não falhar se não conseguir registrar o histórico, mas logar o erro
    }

    console.log('Balance adjusted successfully from', currentBalance, 'to', newBalance);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Saldo ajustado com sucesso',
        old_balance: currentBalance,
        new_balance: newBalance
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in adjust-user-balance function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
