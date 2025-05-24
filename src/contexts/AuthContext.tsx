
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  profile: 'admin' | 'user';
  status: 'active' | 'inactive';
  balance: number;
  createdAt: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log('AuthProvider - current user:', user, 'isLoading:', isLoading);

  // Check for existing session on mount
  useEffect(() => {
    console.log('Initializing Supabase auth...');
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Found existing session:', session.user.id);
          await loadUserProfile(session.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('Loading profile for user:', supabaseUser.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        throw new Error('Erro ao carregar perfil do usuário');
      }

      if (!profile) {
        console.log('Profile not found, user may need to contact support');
        throw new Error('Perfil não encontrado. Contate o suporte.');
      }

      if (!profile.active) {
        console.log('User profile is inactive');
        throw new Error('Usuário inativo. Acesso negado.');
      }

      const userData: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        profile: profile.profile,
        status: profile.active ? 'active' : 'inactive',
        balance: Number(profile.balance),
        createdAt: profile.created_at,
        lastLogin: new Date().toISOString(),
      };

      console.log('Profile loaded successfully:', userData);
      setUser(userData);
    } catch (error: any) {
      console.error('Error in loadUserProfile:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting Supabase login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Supabase login error:', error);
        throw new Error('Email ou senha inválidos');
      }

      if (!data.session?.user) {
        throw new Error('Erro na autenticação');
      }

      console.log('Supabase login successful, loading profile...');
      await loadUserProfile(data.session.user);
      
      console.log('Login complete, navigating to dashboard...');
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo à plataforma TreexPay",
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      toast({
        variant: "destructive",
        title: "Erro de login",
        description: error.message || "Email ou senha incorretos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting Supabase signup for:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (error) {
        console.error('Supabase signup error:', error);
        throw new Error(error.message);
      }

      toast({
        title: "Cadastro realizado",
        description: "Verifique seu email para confirmar a conta",
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error.message || "Erro ao criar conta",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      setIsLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        throw new Error(error.message);
      }
      
      setUser(null);
      navigate('/');
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Até logo!",
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Erro no logout",
        description: error.message || "Erro ao fazer logout",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isAdmin: user?.profile === 'admin',
      isLoading,
      login, 
      logout,
      signUp
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
