
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
    
    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed', { event, hasSession: !!session });
        
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
      console.log('AuthContext: Verificando sessão...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('AuthContext: Sessão encontrada, carregando perfil...');
        await loadUserProfile(session.user);
      } else {
        console.log('AuthContext: Nenhuma sessão encontrada');
        setLoading(false);
      }
    } catch (error) {
      console.error('AuthContext: Erro ao verificar sessão:', error);
      setLoading(false);
    }
  };

  const loadUserProfile = async (authUser: SupabaseUser, retryCount = 0) => {
    try {
      console.log('AuthContext: Carregando perfil do usuário:', authUser.email, { retryCount });
      setProfileError(null);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('AuthContext: Erro ao carregar perfil:', error);
        
        // Distinguir entre erros temporários e permanentes
        const isNetworkError = error.message?.includes('network') || 
                              error.message?.includes('timeout') || 
                              error.code === 'PGRST301';
        
        if (isNetworkError && retryCount < 2) {
          console.log('AuthContext: Erro de rede detectado, tentando novamente em 1s...');
          setTimeout(() => {
            loadUserProfile(authUser, retryCount + 1);
          }, 1000);
          return;
        }
        
        // Para outros erros, definir estado de erro mas sempre desabilitar loading
        setProfileError('Erro ao carregar perfil do usuário');
        setLoading(false);
        return;
      }

      if (!profile) {
        console.error('AuthContext: Perfil não encontrado para usuário:', authUser.email);
        setProfileError('Perfil de usuário não encontrado');
        setLoading(false);
        return;
      }

      if (!profile.active) {
        console.warn('AuthContext: Usuário inativo:', authUser.email);
        setProfileError('Usuário inativo. Acesso negado.');
        
        // Apenas para usuários inativos, fazer logout
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

      console.log('AuthContext: Perfil carregado com sucesso:', { 
        email: userData.email, 
        profile: userData.profile, 
        active: userData.active 
      });

      setUser(userData);
      setProfileError(null);
      setLoading(false); // Garantir que loading seja sempre desabilitado
    } catch (error) {
      console.error('AuthContext: Erro interno ao carregar perfil:', error);
      setProfileError('Erro interno. Tente novamente.');
      setLoading(false); // Garantir que loading seja sempre desabilitado mesmo em caso de erro
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setProfileError(null);
      
      if (!email?.trim() || !password?.trim()) {
        toast({
          variant: "destructive",
          title: "Dados obrigatórios",
          description: "Email e senha são obrigatórios.",
        });
        setLoading(false); // Desabilitar loading em caso de validação falha
        return;
      }

      const { data: session, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro de login",
          description: "Email ou senha inválidos.",
        });
        setLoading(false); // Desabilitar loading em caso de erro de autenticação
        return;
      }

      if (!session?.user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha na autenticação.",
        });
        setLoading(false); // Desabilitar loading se não há usuário na sessão
        return;
      }

      // O loadUserProfile será chamado automaticamente pelo onAuthStateChange
      // e ele próprio gerenciará o estado de loading
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo à plataforma TreexPay",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('AuthContext: Erro no login:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      setLoading(false); // Garantir que loading seja desabilitado em caso de erro
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfileError(null);
      setLoading(false);
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error('AuthContext: Erro no logout:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao fazer logout.",
      });
      setLoading(false);
    }
  };

  const isAuthenticated = !!user && !!user.active && !profileError;
  const isAdmin = user?.profile === 'admin' && isAuthenticated;

  console.log('AuthContext: Estado atual', { 
    hasUser: !!user, 
    isAuthenticated, 
    isAdmin, 
    loading,
    profileError,
    userProfile: user?.profile 
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
