
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
  const [initialLoading, setInitialLoading] = useState(true); // Loading inicial separado
  const [loginLoading, setLoginLoading] = useState(false); // Loading específico para login
  const [profileError, setProfileError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // O loading que será exposto é apenas o de login, não o inicial
  const loading = loginLoading;

  useEffect(() => {
    console.log('🔄 AuthProvider: Iniciando verificação de sessão...');
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state changed:', { event, hasSession: !!session, userEmail: session?.user?.email });
        
        if (session?.user) {
          console.log('👤 Usuário autenticado, carregando perfil...');
          await loadUserProfile(session.user);
        } else {
          console.log('❌ Sem sessão, limpando estado...');
          setUser(null);
          setProfileError(null);
          setInitialLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 AuthProvider: Limpando subscription...');
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      console.log('🔍 Verificando sessão existente...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro ao verificar sessão:', error);
        setInitialLoading(false);
        return;
      }
      
      if (session?.user) {
        console.log('✅ Sessão encontrada:', session.user.email);
        await loadUserProfile(session.user);
      } else {
        console.log('ℹ️ Nenhuma sessão encontrada');
        setInitialLoading(false);
      }
    } catch (error) {
      console.error('💥 Erro interno ao verificar sessão:', error);
      setInitialLoading(false);
    }
  };

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('📊 Carregando perfil do usuário:', authUser.email);
      setProfileError(null);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('📋 Resultado da query de perfil:', { profile, error });

      if (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        if (error.code === 'PGRST116') {
          setProfileError('Perfil de usuário não encontrado no banco de dados');
        } else {
          setProfileError('Erro ao carregar perfil do usuário');
        }
        setInitialLoading(false);
        return;
      }

      if (!profile) {
        console.error('❌ Perfil não encontrado para usuário:', authUser.email);
        setProfileError('Perfil de usuário não encontrado');
        setInitialLoading(false);
        return;
      }

      if (!profile.active) {
        console.warn('⚠️ Usuário inativo:', authUser.email);
        setProfileError('Usuário inativo. Acesso negado.');
        await supabase.auth.signOut();
        setInitialLoading(false);
        return;
      }

      const userData = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        profile: profile.profile,
        active: profile.active,
      };

      console.log('✅ Perfil carregado com sucesso:', { 
        email: userData.email, 
        profile: userData.profile,
        active: userData.active
      });

      setUser(userData);
      setProfileError(null);
      setInitialLoading(false);
    } catch (error) {
      console.error('💥 Erro interno ao carregar perfil:', error);
      setProfileError('Erro interno. Tente novamente.');
      setInitialLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🚀 Iniciando processo de login para:', email);
      setLoginLoading(true); // Usar loginLoading específico
      setProfileError(null);
      
      if (!email?.trim() || !password?.trim()) {
        console.error('❌ Dados de login inválidos');
        toast({
          variant: "destructive",
          title: "Dados obrigatórios",
          description: "Email e senha são obrigatórios.",
        });
        setLoginLoading(false);
        return;
      }

      console.log('📡 Enviando credenciais para Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      console.log('📨 Resposta do Supabase Auth:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        error: error?.message 
      });

      if (error) {
        console.error('❌ Erro de autenticação:', error);
        let errorMessage = "Email ou senha inválidos.";
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Email ou senha incorretos.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Email não confirmado. Verifique sua caixa de entrada.";
        } else if (error.message.includes('Too many requests')) {
          errorMessage = "Muitas tentativas. Tente novamente em alguns minutos.";
        }
        
        toast({
          variant: "destructive",
          title: "Erro de login",
          description: errorMessage,
        });
        setLoginLoading(false);
        return;
      }

      if (!data?.user || !data?.session) {
        console.error('❌ Dados de autenticação inválidos retornados');
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha na autenticação.",
        });
        setLoginLoading(false);
        return;
      }

      console.log('✅ Autenticação bem-sucedida, aguardando carregamento do perfil...');
      // O loginLoading será resetado quando o perfil for carregado via onAuthStateChange
      
    } catch (error) {
      console.error('💥 Erro interno de login:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Iniciando logout...');
      await supabase.auth.signOut();
      setUser(null);
      setProfileError(null);
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      console.log('✅ Logout concluído');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao fazer logout.",
      });
    }
  };

  const isAuthenticated = !!user && !!user.active && !profileError;
  const isAdmin = user?.profile === 'admin' && isAuthenticated;

  console.log('📊 Estado atual do Auth:', { 
    hasUser: !!user, 
    isAuthenticated, 
    isAdmin, 
    initialLoading,
    loginLoading,
    profileError,
    userEmail: user?.email 
  });

  // Verificar se o usuário está tentando acessar rota protegida sem estar logado
  useEffect(() => {
    if (!initialLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      const publicRoutes = ['/', '/login'];
      
      if (!publicRoutes.includes(currentPath)) {
        console.log('🔒 Usuário não autenticado tentando acessar rota protegida, redirecionando...');
        navigate('/');
      }
    }
  }, [initialLoading, isAuthenticated, navigate]);

  // Navegação automática após login bem-sucedido
  useEffect(() => {
    if (isAuthenticated && !initialLoading && !profileError) {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/login') {
        console.log('🎯 Login completo, redirecionando para dashboard...');
        setLoginLoading(false); // Resetar loading de login
        navigate('/dashboard');
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo à plataforma TreexPay",
        });
      }
    }
  }, [isAuthenticated, initialLoading, profileError, navigate, toast]);

  // Se ainda está carregando a sessão inicial, mostrar loading
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
      loading, // Agora é apenas o loginLoading
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
