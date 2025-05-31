
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
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', { event, hasSession: !!session });
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setProfileError(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      console.log('Verificando sessão existente...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Sessão encontrada, carregando perfil...');
        await loadUserProfile(session.user);
      } else {
        console.log('Nenhuma sessão encontrada');
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      setLoading(false);
    }
  };

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('Carregando perfil do usuário:', authUser.email);
      setProfileError(null);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        setProfileError('Erro ao carregar perfil do usuário');
        setLoading(false);
        return;
      }

      if (!profile) {
        console.error('Perfil não encontrado para usuário:', authUser.email);
        setProfileError('Perfil de usuário não encontrado');
        setLoading(false);
        return;
      }

      if (!profile.active) {
        console.warn('Usuário inativo:', authUser.email);
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

      console.log('Perfil carregado com sucesso:', { 
        email: userData.email, 
        profile: userData.profile 
      });

      setUser(userData);
      setProfileError(null);
      setLoading(false);
    } catch (error) {
      console.error('Erro interno ao carregar perfil:', error);
      setProfileError('Erro interno. Tente novamente.');
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setProfileError(null);
      
      console.log('Iniciando login para:', email);
      
      if (!email?.trim() || !password?.trim()) {
        toast({
          variant: "destructive",
          title: "Dados obrigatórios",
          description: "Email e senha são obrigatórios.",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        console.error('Erro de login:', error);
        toast({
          variant: "destructive",
          title: "Erro de login",
          description: "Email ou senha inválidos.",
        });
        setLoading(false);
        return;
      }

      if (!data?.user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha na autenticação.",
        });
        setLoading(false);
        return;
      }

      console.log('Login bem-sucedido, carregando perfil...');
      await loadUserProfile(data.user);

      // Só navegar se tudo deu certo
      if (user && !profileError) {
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo à plataforma TreexPay",
        });
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Erro interno de login:', error);
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
      await supabase.auth.signOut();
      setUser(null);
      setProfileError(null);
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao fazer logout.",
      });
    }
  };

  const isAuthenticated = !!user && !!user.active && !profileError;
  const isAdmin = user?.profile === 'admin' && isAuthenticated;

  console.log('Estado do Auth:', { 
    hasUser: !!user, 
    isAuthenticated, 
    isAdmin, 
    loading,
    profileError 
  });

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
