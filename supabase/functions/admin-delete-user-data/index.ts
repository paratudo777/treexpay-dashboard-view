import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autenticação não fornecido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('profile')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.profile !== 'admin') {
      console.error('Profile check error:', profileError);
      return new Response(JSON.stringify({ error: 'Sem permissão de administrador' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Deleting all data for user:', userId);

    // Delete from all related tables
    await supabaseAdmin.from('checkouts').delete().eq('user_id', userId);
    await supabaseAdmin.from('checkout_payments').delete().in('checkout_id', 
      supabaseAdmin.from('checkouts').select('id').eq('user_id', userId)
    );
    await supabaseAdmin.from('deposits').delete().eq('user_id', userId);
    await supabaseAdmin.from('withdrawals').delete().eq('user_id', userId);
    await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
    await supabaseAdmin.from('settings').delete().eq('user_id', userId);
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId);
    await supabaseAdmin.from('ranking').delete().eq('user_id', userId);
    await supabaseAdmin.from('api_keys').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_webhooks').delete().eq('user_id', userId);
    await supabaseAdmin.from('two_factor_auth').delete().eq('user_id', userId);

    // Delete user from auth (this will cascade delete profile)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      throw deleteAuthError;
    }

    console.log('All data deleted successfully for user:', userId);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Todos os dados do usuário foram removidos permanentemente' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in admin-delete-user-data:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
