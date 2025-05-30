
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  profile: 'admin' | 'user';
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const initializationRef = useRef(false);

  console.log('AuthProvider render - Current state:', { 
    loading, 
    isAuthenticated: !!user && user.active, 
    userExists: !!user,
    userActive: user?.active,
    currentPath: location.pathname
  });

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log('AuthProvider - Setting up auth initialization (one time only)');
    
    const initializeAuth = async () => {
      try {
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('AuthProvider - Auth state changed:', { event, hasSession: !!session, userId: session?.user?.id });
          
          if (event === 'SIGNED_OUT' || !session) {
            console.log('AuthProvider - User signed out, clearing state');
            setUser(null);
            setLoading(false);
            return;
          }

          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            console.log('AuthProvider - User signed in, loading profile');
            await loadUserProfile(session.user);
          }
        });

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthProvider - Initial session check:', { hasSession: !!session });
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          console.log('AuthProvider - No initial session, setting loading to false');
          setLoading(false);
        }

        return () => {
          console.log('AuthProvider - Cleaning up auth listener');
          subscription.unsubscribe();
        };

      } catch (error) {
        console.error('AuthProvider - Initialization error:', error);
        setLoading(false);
      }
    };

    const cleanup = initializeAuth();
    
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []); // Empty dependency array para evitar re-execução

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('AuthProvider - Loading profile for user:', authUser.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('AuthProvider - Profile load error:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar perfil do usuário.",
        });
        setLoading(false);
        return;
      }

      if (!profile) {
        console.log('AuthProvider - Profile not found');
        toast({
          variant: "destructive",
          title: "Perfil não encontrado",
          description: "Perfil de usuário não encontrado.",
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!profile.active) {
        console.log('AuthProvider - User inactive');
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Usuário inativo. Acesso negado.",
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const userData = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        profile: profile.profile,
        active: profile.active,
      };

      console.log('AuthProvider - Profile loaded successfully:', { id: userData.id, profile: userData.profile, active: userData.active });
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('AuthProvider - Load profile error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('AuthProvider - Starting login process');
    
    if (!email?.trim() || !password?.trim()) {
      toast({
        variant: "destructive",
        title: "Dados obrigatórios",
        description: "Email e senha são obrigatórios.",
      });
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError) {
        console.error('AuthProvider - Login error:', authError);
        toast({
          variant: "destructive",
          title: "Erro de login",
          description: "Email ou senha inválidos.",
        });
        return;
      }

      if (!authData?.user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha na autenticação.",
        });
        return;
      }

      console.log('AuthProvider - Login API successful, navigating to dashboard');
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo à plataforma TreexPay",
      });

      // Navigate to dashboard after successful login
      navigate('/dashboard', { replace: true });

    } catch (error) {
      console.error('AuthProvider - Login catch error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    }
  };

  const logout = async () => {
    try {
      console.log('AuthProvider - Starting logout');
      await supabase.auth.signOut();
      setUser(null);
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error('AuthProvider - Logout error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao fazer logout.",
      });
    }
  };

  const isAuthenticated = !!user && user.active;
  const isAdmin = user?.profile === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isAdmin,
      login, 
      logout,
      loading
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
