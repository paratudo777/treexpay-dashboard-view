
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Crie um cliente Supabase para validar o JWT do usuário
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("send-test-notification: Unauthorized access attempt.");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`send-test-notification: Request received for user ${user.id}`);

    // Use o cliente com service_role para buscar o perfil
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('onesignal_player_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(`send-test-notification: Error fetching profile for user ${user.id}`, profileError);
      throw new Error('Profile not found.');
    }
    
    if (!profile || !profile.onesignal_player_id) {
      console.error(`send-test-notification: OneSignal Player ID not found for user ${user.id}`);
      throw new Error('OneSignal Player ID not found for this user.');
    }

    const playerId = profile.onesignal_player_id;

    console.log(`send-test-notification: Found Player ID ${playerId}. Invoking send-onesignal-notification function.`);

    const { error: notificationError } = await supabaseAdmin.functions.invoke('send-onesignal-notification', {
      body: {
        playerId: playerId,
        title: 'Notificação de Teste ⚙️',
        message: 'Se você recebeu isso, a integração com OneSignal está funcionando!',
      },
    });

    if (notificationError) {
      console.error(`send-test-notification: Error invoking send-onesignal-notification`, notificationError);
      throw new Error(`Failed to send test notification: ${notificationError.message || 'Unknown error'}`);
    }

    console.log(`send-test-notification: Test notification sent successfully to Player ID ${playerId}`);

    return new Response(JSON.stringify({ success: true, message: 'Test notification sent successfully.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("send-test-notification: Unhandled error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
