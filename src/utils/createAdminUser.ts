
import { supabase } from '@/integrations/supabase/client';

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateAdminUserResponse {
  success: boolean;
  message: string;
  user_id?: string;
  email?: string;
  error?: string;
  details?: string;
}

export const createAdminUser = async (request: CreateAdminUserRequest): Promise<CreateAdminUserResponse> => {
  try {
    console.log('Calling create-admin-user function with:', { email: request.email, name: request.name });
    
    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      body: request
    });

    if (error) {
      console.error('Error calling create-admin-user function:', error);
      return {
        success: false,
        error: 'Failed to create admin user',
        details: error.message
      };
    }

    console.log('Admin user creation response:', data);
    return data;
    
  } catch (error: any) {
    console.error('Unexpected error creating admin user:', error);
    return {
      success: false,
      error: 'Unexpected error',
      details: error.message
    };
  }
};
