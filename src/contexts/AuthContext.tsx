
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: any;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const isAdmin = user?.email === 'manomassa717@gmail.com' || 
                  user?.email === 'admin@treexpay.com' ||
                  profile?.profile === 'admin';

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        console.log('AuthContext: Iniciando verificação de sessão');
        
        // Verificar se há sessão existente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Erro ao verificar sessão:', error);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('AuthContext: Sessão encontrada para:', session.user.email);
          if (mounted) {
            setUser(session.user);
            await loadUserProfile(session.user.id);
          }
        } else {
          console.log('AuthContext: Nenhuma sessão encontrada');
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('AuthContext: Erro na inicialização:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('AuthContext: Mudança de estado de auth:', event, session?.user?.email);
      
      if (session?.user && event === 'SIGNED_IN') {
        console.log('AuthContext: Login detectado, carregando dados do usuário:', session.user.email);
        setUser(session.user);
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('AuthContext: Logout detectado, limpando dados');
        setUser(null);
        setProfile(null);
        if (mounted) setLoading(false);
      } else if (!session) {
        console.log('AuthContext: Sem sessão, limpando dados');
        setUser(null);
        setProfile(null);
        if (mounted) setLoading(false);
      }
    });

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('AuthContext: Carregando perfil do usuário:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('AuthContext: Erro ao carregar perfil:', error);
        setProfile(null);
      } else {
        console.log('AuthContext: Perfil carregado:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('AuthContext: Exceção ao carregar perfil:', error);
      setProfile(null);
    } finally {
      // SEMPRE finalizar o loading, independentemente do resultado
      console.log('AuthContext: Finalizando loading');
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('AuthContext: Tentativa de login para:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthContext: Erro no login:', error.message);
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('AuthContext: Login bem-sucedido para:', email);
        // O onAuthStateChange vai lidar com o resto
        return { success: true };
      } else {
        console.error('AuthContext: Login sem erro mas sem usuário retornado');
        setLoading(false);
        return { success: false, error: 'Login falhou sem retornar usuário' };
      }
    } catch (error) {
      console.error('AuthContext: Exceção no login:', error);
      setLoading(false);
      return { success: false, error: 'Erro interno' };
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Fazendo logout...');
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setLoading(false);
      console.log('AuthContext: Logout realizado com sucesso');
    } catch (error) {
      console.error('AuthContext: Erro no logout:', error);
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    isAuthenticated: !!user,
    isAdmin,
    loading,
    login,
    logout,
  };

  console.log('AuthContext: Estado atual:', { 
    user: user?.email, 
    isAuthenticated: !!user, 
    isAdmin, 
    loading,
    profile: profile?.profile 
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
