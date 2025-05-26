
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
    // Configurar listener de mudanças de autenticação PRIMEIRO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          // Usuário logado - carregar perfil
          await loadUserProfile(session.user);
        } else {
          // Usuário deslogado
          setUser(null);
          setLoading(false);
        }
      }
    );

    // DEPOIS verificar sessão existente
    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkInitialSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Sessão inicial verificada:', session?.user?.id);
      
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao verificar sessão inicial:', error);
      setLoading(false);
    }
  };

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
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
        toast({
          variant: "destructive",
          title: "Acesso negado",
          description: "Usuário inativo. Acesso negado.",
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        profile: profile.profile,
        active: profile.active,
      });
      
      console.log('Perfil carregado com sucesso:', profile.name);
    } catch (error) {
      console.error('Erro interno ao carregar perfil:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      await supabase.auth.signOut();
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

      // O perfil será carregado automaticamente pelo listener onAuthStateChange
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo à plataforma TreexPay",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
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
      // O estado será limpo automaticamente pelo listener onAuthStateChange
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao fazer logout.",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user && !!user.active, 
      isAdmin: user?.profile === 'admin',
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
