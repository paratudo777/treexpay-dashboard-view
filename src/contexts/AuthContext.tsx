
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

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

  // Convert Supabase profile to our User type
  const mapProfileToUser = (profile: Profile, supabaseUser: SupabaseUser): User => ({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    profile: profile.profile,
    status: profile.active ? 'active' : 'inactive',
    balance: Number(profile.balance),
    createdAt: profile.created_at,
    lastLogin: supabaseUser.last_sign_in_at || undefined,
  });

  // Create profile if it doesn't exist
  const createMissingProfile = async (supabaseUser: SupabaseUser): Promise<Profile | null> => {
    try {
      console.log('Creating missing profile for user:', supabaseUser.id);
      
      const newProfile = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        name: supabaseUser.user_metadata?.name || supabaseUser.email!,
        profile: 'user' as const,
        active: true,
        balance: 0.00,
        notifications_enabled: true,
        two_fa_enabled: false
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      console.log('Profile created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createMissingProfile:', error);
      return null;
    }
  };

  // Load user profile from Supabase with improved error handling
  const loadUserProfile = async (supabaseUser: SupabaseUser, retryCount = 0) => {
    const MAX_RETRIES = 1;

    try {
      console.log('Loading profile for user:', supabaseUser.id, 'Retry:', retryCount);
      
      // Simple query without artificial timeout
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        
        // Only retry on specific errors (network issues, temporary failures)
        if (retryCount < MAX_RETRIES && (error.message?.includes('timeout') || error.message?.includes('network'))) {
          console.log(`Retrying profile load... (${retryCount + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadUserProfile(supabaseUser, retryCount + 1);
        }
        
        throw error;
      }

      if (!profile) {
        console.log('No profile found for user:', supabaseUser.id, 'attempting to create one...');
        
        // Try to create the missing profile
        const createdProfile = await createMissingProfile(supabaseUser);
        
        if (createdProfile) {
          const userData = mapProfileToUser(createdProfile, supabaseUser);
          console.log('Setting user data from created profile:', userData);
          setUser(userData);
          
          toast({
            title: "Perfil criado",
            description: "Seu perfil foi criado automaticamente. Bem-vindo!",
          });
          return;
        } else {
          // Profile creation failed, show error and logout
          console.error('Failed to create profile for user:', supabaseUser.id);
          toast({
            variant: "destructive",
            title: "Erro ao criar perfil",
            description: "Não foi possível criar seu perfil. Entre em contato com o suporte.",
          });
          await supabase.auth.signOut();
          setUser(null);
          return;
        }
      }

      // Verify profile data integrity
      if (!profile.email || !profile.name) {
        console.error('Profile data incomplete:', profile);
        toast({
          variant: "destructive",
          title: "Dados do perfil incompletos",
          description: "Perfil encontrado mas dados estão incompletos. Entre em contato com o suporte.",
        });
        setUser(null);
        return;
      }

      const userData = mapProfileToUser(profile, supabaseUser);
      console.log('Setting user data:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Only retry on timeout errors, not on other types of errors
      if (retryCount < MAX_RETRIES && error instanceof Error && error.message.includes('timeout')) {
        console.log(`Retrying profile load after timeout... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return loadUserProfile(supabaseUser, retryCount + 1);
      }
      
      // After all retries failed or non-retryable error, clear user state
      setUser(null);
      toast({
        variant: "destructive",
        title: "Erro ao carregar perfil",
        description: "Não foi possível carregar suas informações. Fazendo logout para tentar novamente.",
      });
      await supabase.auth.signOut();
    }
  };

  // Check authentication state on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        if (session?.user && mounted) {
          console.log('Found existing session:', session.user.id);
          await loadUserProfile(session.user);
        } else {
          console.log('No existing session found');
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        if (mounted) {
          console.log('Auth initialization complete, setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, loading profile...');
          setIsLoading(true);
          await loadUserProfile(session.user);
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed');
          // Don't reload profile on token refresh if we already have user data
          if (!user) {
            console.log('No user data, loading profile after token refresh...');
            await loadUserProfile(session.user);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        console.log('Login successful, loading profile...');
        await loadUserProfile(data.user);
        
        // Additional check: verify user is active before proceeding
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('active, profile')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error checking user status:', profileError);
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Erro de autenticação",
            description: "Não foi possível verificar o status da conta.",
          });
          return;
        }

        if (!profile) {
          await supabase.auth.signOut();
          setUser(null);
          toast({
            variant: "destructive",
            title: "Perfil não encontrado",
            description: "Seu perfil não foi encontrado no sistema.",
          });
          return;
        }

        if (!profile?.active) {
          await supabase.auth.signOut();
          setUser(null);
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Sua conta não está ativa. Entre em contato com o administrador.",
          });
          return;
        }

        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo à plataforma TreexPay",
        });

        console.log('Navigating to dashboard...');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      let errorMessage = "Credenciais inválidas";
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Email ou senha incorretos";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Email não confirmado. Verifique sua caixa de entrada.";
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = "Muitas tentativas de login. Tente novamente em alguns minutos.";
      }
      
      toast({
        variant: "destructive",
        title: "Erro de login",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting signup for:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        toast({
          title: "Cadastro realizado com sucesso",
          description: "Verifique seu email para confirmar a conta.",
        });
      }
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
        throw error;
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
