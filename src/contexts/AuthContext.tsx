
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  profileError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 AuthProvider: Iniciando...');
    
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('✅ Sessão encontrada:', session.user.email);
        createUserFromAuth(session.user);
      }
      setInitialLoading(false);
    });

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth mudou:', event, session?.user?.email);
        
        if (session?.user) {
          createUserFromAuth(session.user);
        } else {
          setUser(null);
          setProfileError(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const createUserFromAuth = (authUser: SupabaseUser) => {
    console.log('👤 Criando usuário do auth:', authUser.email);
    
    const userData: User = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.email || '',
      profile: authUser.email === 'admin@treexpay.com' ? 'admin' : 'user',
      active: true,
    };

    setUser(userData);
    setProfileError(null);
    setLoading(false);
    
    console.log('✅ Usuário criado:', userData);
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🚀 Login iniciado para:', email);
      setLoading(true);
      setProfileError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        console.error('❌ Erro de login:', error);
        toast({
          variant: "destructive",
          title: "Erro de login",
          description: "Email ou senha incorretos.",
        });
        setLoading(false);
        return;
      }

      if (data?.user) {
        console.log('✅ Login bem-sucedido');
        // O onAuthStateChange vai lidar com o resto
      }
      
    } catch (error) {
      console.error('💥 Erro interno:', error);
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
      console.log('🚪 Logout...');
      await supabase.auth.signOut();
      setUser(null);
      setProfileError(null);
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    }
  };

  const isAuthenticated = !!user && !profileError;
  const isAdmin = user?.profile === 'admin' && isAuthenticated;

  // Redirecionar para dashboard após login
  useEffect(() => {
    if (isAuthenticated && !loading && !initialLoading) {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/login') {
        console.log('🎯 Redirecionando para dashboard...');
        navigate('/dashboard');
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo à plataforma TreexPay",
        });
      }
    }
  }, [isAuthenticated, loading, initialLoading, navigate, toast]);

  // Loading inicial por no máximo 1 segundo
  if (initialLoading) {
    setTimeout(() => setInitialLoading(false), 1000);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isAdmin,
      login, 
      logout,
      loading,
      profileError
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
