
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
    let timeoutId: NodeJS.Timeout;
    
    const initAuth = async () => {
      try {
        console.log('AuthContext: Iniciando verificação de autenticação...');
        
        // Timeout de segurança para loading
        timeoutId = setTimeout(() => {
          console.log('AuthContext: Timeout de inicialização atingido');
          setLoading(false);
        }, 3000);

        // Verificar sessão atual
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Erro ao obter sessão:', error);
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        console.log('AuthContext: Sessão obtida:', session ? 'Ativa' : 'Inativa');

        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        } else {
          // Se não há sessão, garantir que está deslogado
          setUser(null);
          setProfile(null);
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (error) {
        console.error('AuthContext: Erro na inicialização:', error);
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Mudança de estado:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        await loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    initAuth();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('AuthContext: Carregando perfil do usuário:', userId);
      
      const profileTimeout = setTimeout(() => {
        console.log('AuthContext: Timeout do perfil atingido');
        setLoading(false);
      }, 2000);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      clearTimeout(profileTimeout);

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
        console.error('AuthContext: Erro no login:', error);
        setLoading(false);
        return { success: false, error: error.message };
      }

      console.log('AuthContext: Login bem-sucedido para:', email);
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Exceção no login:', error);
      setLoading(false);
      return { success: false, error: 'Erro interno' };
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Fazendo logout...');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      console.log('AuthContext: Logout realizado com sucesso');
    } catch (error) {
      console.error('AuthContext: Erro no logout:', error);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
