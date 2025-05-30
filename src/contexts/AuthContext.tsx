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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('AuthContext: Carregando perfil do usuário:', authUser.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('AuthContext: Erro ao carregar perfil:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar perfil do usuário.",
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!profile) {
        console.error('AuthContext: Perfil não encontrado para usuário:', authUser.email);
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
        console.warn('AuthContext: Usuário inativo:', authUser.email);
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

      console.log('AuthContext: Perfil carregado com sucesso:', { 
        email: userData.email, 
        profile: userData.profile, 
        active: userData.active 
      });

      setUser(userData);
    } catch (error) {
      console.error('AuthContext: Erro interno ao carregar perfil:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
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
        return;
      }

      if (!session?.user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha na autenticação.",
        });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        toast({
          variant: "destructive",
          title: "Perfil não encontrado",
          description: "Perfil de usuário não encontrado.",
        });
        await supabase.auth.signOut();
        return;
      }

      if (!profile.active) {
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Usuário inativo. Acesso negado.",
        });
        await supabase.auth.signOut();
        return;
      }

      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        profile: profile.profile,
        active: profile.active,
      });

      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo à plataforma TreexPay",
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao fazer logout.",
      });
    }
  };

  const isAuthenticated = !!user && !!user.active;
  const isAdmin = user?.profile === 'admin';

  console.log('AuthContext: Estado atual', { 
    hasUser: !!user, 
    isAuthenticated, 
    isAdmin, 
    loading,
    userProfile: user?.profile 
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
