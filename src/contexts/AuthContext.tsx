
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔄 AuthProvider: Iniciando verificação de sessão...');
    
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📋 Sessão verificada:', !!session?.user);
      if (session?.user) {
        createUserFromAuth(session.user);
      }
      setInitialLoading(false);
    });

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔔 Auth mudou:', event);
        
        if (session?.user) {
          createUserFromAuth(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const createUserFromAuth = (authUser: SupabaseUser) => {
    console.log('👤 Criando usuário:', authUser.email);
    
    const userData: User = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.email || '',
      profile: authUser.email === 'admin@treexpay.com' ? 'admin' : 'user',
      active: true,
    };

    setUser(userData);
    setLoading(false);
    
    console.log('✅ Usuário definido:', userData.email);
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🚀 Tentando login:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        console.error('❌ Erro de login:', error.message);
        toast({
          variant: "destructive",
          title: "Erro de login",
          description: "Email ou senha incorretos.",
        });
        setLoading(false);
        return;
      }

      console.log('✅ Login realizado com sucesso');
      
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
      console.log('🚪 Fazendo logout...');
      await supabase.auth.signOut();
      setUser(null);
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error('❌ Erro no logout:', error);
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.profile === 'admin';

  // Redirecionar para dashboard após login bem-sucedido
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

  // Loading inicial
  if (initialLoading) {
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
      profileError: null
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
