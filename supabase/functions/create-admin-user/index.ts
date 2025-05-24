
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminRequest {
  email: string;
  password: string;
  name: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, name }: CreateAdminRequest = await req.json()

    console.log('Creating admin user with email:', email)

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user in Auth', details: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authUser.user) {
      console.error('No user returned from auth creation')
      return new Response(
        JSON.stringify({ error: 'No user returned from auth creation' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Auth user created successfully:', authUser.user.id)

    // Check if profile already exists (the trigger should have created it)
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authUser.user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', checkError)
    }

    if (existingProfile) {
      console.log('Profile already exists, updating to admin')
      // Update existing profile to admin
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          profile: 'admin',
          active: true,
          name: name,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating profile to admin:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update profile to admin', details: updateError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Profile updated to admin successfully')
    } else {
      console.log('Creating new admin profile')
      // Create admin profile manually if trigger didn't work
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUser.user.id,
          name: name,
          email: email,
          profile: 'admin',
          active: true,
          balance: 0.00,
          notifications_enabled: true,
          two_fa_enabled: false
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating admin profile:', profileError)
        return new Response(
          JSON.stringify({ error: 'Failed to create admin profile', details: profileError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Admin profile created successfully')
    }

    // Ensure settings exist for the admin user
    const { data: existingSettings } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('user_id', authUser.user.id)
      .single()

    if (!existingSettings) {
      console.log('Creating settings for admin user')
      const { error: settingsError } = await supabaseAdmin
        .from('settings')
        .insert({
          user_id: authUser.user.id,
          deposit_fee: 0.00,
          withdrawal_fee: 0.00
        })

      if (settingsError) {
        console.error('Error creating settings:', settingsError)
        // Don't fail the whole operation for settings
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        user_id: authUser.user.id,
        email: authUser.user.email
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
