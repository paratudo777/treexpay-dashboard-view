
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
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
          setLoading(false);
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
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        console.log('✅ Sessão encontrada:', session.user.email);
        await loadUserProfile(session.user);
      } else {
        console.log('ℹ️ Nenhuma sessão encontrada');
        setLoading(false);
      }
    } catch (error) {
      console.error('💥 Erro interno ao verificar sessão:', error);
      setLoading(false);
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
        setLoading(false);
        return;
      }

      if (!profile) {
        console.error('❌ Perfil não encontrado para usuário:', authUser.email);
        setProfileError('Perfil de usuário não encontrado');
        setLoading(false);
        return;
      }

      if (!profile.active) {
        console.warn('⚠️ Usuário inativo:', authUser.email);
        setProfileError('Usuário inativo. Acesso negado.');
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

      console.log('✅ Perfil carregado com sucesso:', { 
        email: userData.email, 
        profile: userData.profile,
        active: userData.active
      });

      setUser(userData);
      setProfileError(null);
      setLoading(false);
    } catch (error) {
      console.error('💥 Erro interno ao carregar perfil:', error);
      setProfileError('Erro interno. Tente novamente.');
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🚀 Iniciando processo de login para:', email);
      setLoading(true);
      setProfileError(null);
      
      if (!email?.trim() || !password?.trim()) {
        console.error('❌ Dados de login inválidos');
        toast({
          variant: "destructive",
          title: "Dados obrigatórios",
          description: "Email e senha são obrigatórios.",
        });
        setLoading(false);
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
        setLoading(false);
        return;
      }

      if (!data?.user || !data?.session) {
        console.error('❌ Dados de autenticação inválidos retornados');
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha na autenticação.",
        });
        setLoading(false);
        return;
      }

      console.log('✅ Autenticação bem-sucedida, aguardando carregamento do perfil...');
      // O perfil será carregado automaticamente pelo onAuthStateChange
      
    } catch (error) {
      console.error('💥 Erro interno de login:', error);
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
    loading,
    profileError,
    userEmail: user?.email 
  });

  // Navegação automática após login bem-sucedido
  useEffect(() => {
    if (isAuthenticated && !loading && !profileError) {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/login') {
        console.log('🎯 Login completo, redirecionando para dashboard...');
        navigate('/dashboard');
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo à plataforma TreexPay",
        });
      }
    }
  }, [isAuthenticated, loading, profileError, navigate, toast]);

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
