
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
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

  // Navegação inteligente após login bem-sucedido
  useEffect(() => {
    if (user && !loading && location.pathname === '/') {
      console.log('AuthProvider - User authenticated and on login page, navigating to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  useEffect(() => {
    console.log('AuthProvider - Initializing auth check');
    
    // Setup auth state listener primeiro
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider - Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('AuthProvider - User signed out');
        setUser(null);
        setLoading(false);
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        console.log('AuthProvider - User signed in, loading profile');
        await loadUserProfile(session.user);
      }
    });

    // Verificar sessão existente
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      console.log('AuthProvider - Checking existing session');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('AuthProvider - Session found, loading profile');
        await loadUserProfile(session.user);
      } else {
        console.log('AuthProvider - No session found');
        setLoading(false);
      }
    } catch (error) {
      console.error('AuthProvider - Session check error:', error);
      setLoading(false);
    }
  };

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

      console.log('AuthProvider - Profile loaded successfully:', { ...userData, profile: userData.profile });
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
    try {
      setLoading(true);
      
      if (!email?.trim() || !password?.trim()) {
        toast({
          variant: "destructive",
          title: "Dados obrigatórios",
          description: "Email e senha são obrigatórios.",
        });
        setLoading(false);
        return;
      }

      console.log('AuthProvider - Starting login process');
      
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
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha na autenticação.",
        });
        setLoading(false);
        return;
      }

      console.log('AuthProvider - Login API successful, auth state change will handle the rest');
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo à plataforma TreexPay",
      });

      // Não definir loading como false aqui - deixar o onAuthStateChange gerenciar
      // Não navegar aqui - deixar o useEffect gerenciar baseado no estado do user
    } catch (error) {
      console.error('AuthProvider - Login catch error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('AuthProvider - Starting logout');
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
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
      setLoading(false);
    }
  };

  const isAuthenticated = !!user && user.active;
  const isAdmin = user?.profile === 'admin';

  console.log('AuthProvider - Current state:', { 
    loading, 
    isAuthenticated, 
    isAdmin, 
    userProfile: user?.profile,
    currentPath: location.pathname
  });

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
