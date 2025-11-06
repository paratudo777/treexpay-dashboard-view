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

    const { action, userId, active, deleteUser } = await req.json();

    if (!action || !userId) {
      return new Response(JSON.stringify({ error: 'Ação e userId são obrigatórios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let result;

    switch (action) {
      case 'toggle_status': {
        // Update user status in profiles table
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            active: active,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          throw updateError;
        }

        result = { 
          success: true, 
          message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso` 
        };
        break;
      }

      case 'reset_password': {
        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
        
        const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: tempPassword }
        );

        if (resetError) {
          throw resetError;
        }

        result = { 
          success: true, 
          message: 'Senha resetada com sucesso',
          tempPassword: tempPassword
        };
        break;
      }

      case 'delete_user': {
        if (!deleteUser) {
          return new Response(JSON.stringify({ error: 'Confirmação de exclusão necessária' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          });
        }

        // Delete user from auth (cascade will handle profiles and related data)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          throw deleteError;
        }

        result = { 
          success: true, 
          message: 'Usuário excluído com sucesso' 
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in admin-manage-user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
