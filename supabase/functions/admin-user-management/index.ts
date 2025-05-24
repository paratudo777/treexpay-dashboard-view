import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  profile: 'admin' | 'user';
  depositFee: number;
  withdrawalFee: number;
}

interface UpdateUserRequest {
  userId: string;
  updateAction: 'activate' | 'deactivate' | 'reset-password';
  password?: string;
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

    if (req.method === 'GET') {
      // List all users from profiles table
      console.log('Fetching users list');
      
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to fetch users',
            details: error.message 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Get auth data for last login info
      const usersWithAuthData = await Promise.all(
        profiles.map(async (profile) => {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
          return {
            ...profile,
            lastLogin: authUser.user?.last_sign_in_at || null
          };
        })
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          users: usersWithAuthData 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      if (action === 'create-user') {
        const { name, email, password, profile, depositFee, withdrawalFee }: CreateUserRequest = body;

        // Validar taxas
        if (depositFee < 0 || depositFee > 100 || withdrawalFee < 0 || withdrawalFee > 100) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Invalid fee values. Fees must be between 0 and 100.' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Creating new user:', email, 'with deposit fee:', depositFee, '% and withdrawal fee:', withdrawalFee, '%');

        let createdUserId: string;

        try {
          // Create user in Supabase Auth
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
              name: name
            }
          });

          if (authError) {
            console.error('Error creating auth user:', authError);
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Failed to create user in Auth', 
                details: authError.message 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          if (!authUser.user) {
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'No user returned from auth creation' 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          createdUserId = authUser.user.id;

          // Wait for trigger to create profile
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Update profile with selected role and set as active
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              profile: profile,
              active: true, // Set as active by default
              updated_at: new Date().toISOString()
            })
            .eq('id', createdUserId);

          if (updateError) {
            console.error('Error updating profile:', updateError);
            // Rollback: delete the created user
            await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Failed to update user profile', 
                details: updateError.message 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          // Create settings with fees
          const { error: settingsError } = await supabaseAdmin
            .from('settings')
            .upsert({
              user_id: createdUserId,
              deposit_fee: depositFee,
              withdrawal_fee: withdrawalFee,
              created_at: new Date().toISOString()
            });

          if (settingsError) {
            console.error('Error creating user settings:', settingsError);
            // Rollback: delete the created user
            await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Failed to create user settings', 
                details: settingsError.message 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          console.log('User created successfully with settings:', createdUserId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'User created successfully with custom fees',
              user_id: createdUserId,
              email: authUser.user.email,
              deposit_fee: depositFee,
              withdrawal_fee: withdrawalFee
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );

        } catch (error) {
          console.error('Error in user creation process:', error);
          // Attempt rollback if we have a user ID
          if (createdUserId) {
            try {
              await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            } catch (rollbackError) {
              console.error('Error during rollback:', rollbackError);
            }
          }
          
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'User creation failed', 
              details: error.message 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      if (action === 'update-user') {
        const { userId, updateAction, password }: UpdateUserRequest = body;

        console.log('Updating user:', userId, 'action:', updateAction);

        if (updateAction === 'activate' || updateAction === 'deactivate') {
          const isActive = updateAction === 'activate';
          
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              active: isActive,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) {
            console.error('Error updating user status:', error);
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Failed to update user status', 
                details: error.message 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        if (updateAction === 'reset-password') {
          const newPassword = password || Math.random().toString(36).slice(-8) + '123!';
          
          const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
          });

          if (error) {
            console.error('Error resetting password:', error);
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Failed to reset password', 
                details: error.message 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Password reset successfully',
              newPassword: newPassword
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Invalid request method or action' 
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
