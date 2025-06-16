
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Admin create user function called');

    // Criar cliente Supabase com service role
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

    // Criar cliente normal para verificar permissões
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User authenticated:', user.id);

    // Verificar se o usuário é admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('profile')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.profile !== 'admin') {
      console.error('Admin verification failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado - apenas administradores' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Admin access verified');

    // Obter dados da requisição
    const { name, email, password, profile: userProfile, depositFee, withdrawalFee } = await req.json();

    console.log('Creating user with admin client:', email);

    // Validar dados obrigatórios
    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar usuário usando o cliente administrativo
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        name
      }
    });

    if (authCreateError) {
      console.error('Auth create error:', authCreateError);
      
      let errorMessage = 'Erro ao criar usuário';
      if (authCreateError.message.includes('email address has already been registered')) {
        errorMessage = `Já existe um usuário cadastrado com o email ${email}`;
      } else {
        errorMessage = authCreateError.message;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário - dados inválidos retornados' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User created successfully:', authData.user.id);

    // Aguardar um momento para o trigger criar o profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Atualizar profile usando RPC
    console.log('Updating profile...');
    const { error: profileUpdateError } = await supabaseAdmin.rpc('update_user_profile', {
      p_user_id: authData.user.id,
      p_profile: userProfile || 'user',
      p_active: true
    });

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
      // Não é crítico, continuar
    }

    // Criar configurações do usuário
    console.log('Creating user settings...');
    const { error: settingsError } = await supabaseAdmin
      .from('settings')
      .insert({
        user_id: authData.user.id,
        deposit_fee: parseFloat(depositFee) || 0,
        withdrawal_fee: parseFloat(withdrawalFee) || 0
      });

    if (settingsError) {
      console.error('Settings error:', settingsError);
      // Não é crítico, apenas log do erro
    }

    console.log('User creation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${name} foi criado e está ativo`,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
