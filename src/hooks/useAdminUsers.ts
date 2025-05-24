
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  profile: 'admin' | 'user';
  active: boolean;
  created_at: string;
  lastLogin?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  profile: 'admin' | 'user';
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching users from admin function');
      
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        method: 'GET',
        body: null,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        console.error('Error fetching users:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários.",
        });
        return;
      }

      if (data.success) {
        setUsers(data.users);
        console.log('Users loaded:', data.users.length);
      } else {
        throw new Error(data.error || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message || "Erro inesperado ao carregar usuários.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async (userData: CreateUserData) => {
    try {
      console.log('Creating user:', userData.email);
      
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        method: 'POST',
        body: {
          action: 'create-user',
          ...userData
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Usuário criado com sucesso",
          description: `${userData.name} foi criado e está aguardando ativação.`,
        });
        await fetchUsers(); // Refresh the list
        return true;
      } else {
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message || "Erro inesperado ao criar usuário.",
      });
      return false;
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const actionType = currentStatus ? 'deactivate' : 'activate';
      console.log('Toggling user status:', userId, actionType);
      
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        method: 'POST',
        body: {
          action: 'update-user',
          userId,
          updateAction: actionType
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Status atualizado",
          description: data.message,
        });
        await fetchUsers(); // Refresh the list
        return true;
      } else {
        throw new Error(data.error || 'Failed to update user status');
      }
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message || "Erro inesperado ao atualizar status.",
      });
      return false;
    }
  };

  const resetPassword = async (userId: string) => {
    try {
      console.log('Resetting password for user:', userId);
      
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        method: 'POST',
        body: {
          action: 'update-user',
          userId,
          updateAction: 'reset-password'
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Senha resetada",
          description: `Nova senha temporária: ${data.newPassword}`,
        });
        return data.newPassword;
      } else {
        throw new Error(data.error || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        variant: "destructive",
        title: "Erro ao resetar senha",
        description: error.message || "Erro inesperado ao resetar senha.",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    isLoading,
    createUser,
    toggleUserStatus,
    resetPassword,
    refreshUsers: fetchUsers
  };
};
