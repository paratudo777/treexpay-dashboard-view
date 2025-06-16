
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
    console.log('Creating Supabase client with service role...');
    
    // Create Supabase client with service role for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { email, password, name, profile, depositFee, withdrawalFee } = body;

    console.log('Creating user with email:', email);

    // Validate profile value
    const validProfile = profile === 'admin' ? 'admin' : 'user';
    console.log('Validated profile:', validProfile);

    // Create user using admin API with service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: authError.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = authData.user?.id;
    if (!userId) {
      console.error('No user ID returned from auth creation');
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No user ID returned" 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User created successfully, ID:', userId);

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update profile using the RPC function
    console.log('Updating profile using RPC...');
    const { error: profileError } = await supabase.rpc('update_user_profile', {
      p_user_id: userId,
      p_profile: validProfile,
      p_active: true
    });

    if (profileError) {
      console.error('Profile update error:', profileError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Error updating user profile: ${profileError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Profile updated successfully');

    // Create or update settings
    console.log('Managing user settings...');
    const { data: existingSettings } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingSettings) {
      console.log('Creating new settings for user');
      const { error: settingsError } = await supabase
        .from('settings')
        .insert({
          user_id: userId,
          deposit_fee: parseFloat(depositFee) || 0,
          withdrawal_fee: parseFloat(withdrawalFee) || 0
        });

      if (settingsError) {
        console.error('Settings creation error:', settingsError);
        // Don't fail the whole process for settings error
        console.log('Settings creation failed but user was created successfully');
      } else {
        console.log('Settings created successfully');
      }
    } else {
      console.log('Updating existing settings for user');
      const { error: settingsUpdateError } = await supabase
        .from('settings')
        .update({
          deposit_fee: parseFloat(depositFee) || 0,
          withdrawal_fee: parseFloat(withdrawalFee) || 0
        })
        .eq('user_id', userId);

      if (settingsUpdateError) {
        console.error('Settings update error:', settingsUpdateError);
      } else {
        console.log('Settings updated successfully');
      }
    }

    console.log('User creation process completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: userId,
      message: 'Usuário criado com sucesso'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in admin-create-user function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Internal server error: ${error.message}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
