
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
        console.log('AuthContext: Iniciando verificação rigorosa de sessão');
        
        // Verificar se há sessão existente de forma mais rigorosa
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Erro ao verificar sessão:', error);
          await supabase.auth.signOut(); // Limpar qualquer sessão corrompida
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        // Verificação mais rigorosa da sessão
        if (session?.user && session?.access_token) {
          console.log('AuthContext: Sessão válida encontrada para:', session.user.email);
          
          // Verificar se o token ainda é válido fazendo uma chamada de teste
          const { data: testData, error: testError } = await supabase.auth.getUser();
          
          if (testError || !testData.user) {
            console.log('AuthContext: Token inválido, fazendo logout');
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setProfile(null);
              setLoading(false);
            }
            return;
          }
          
          if (mounted) {
            setUser(session.user);
            setLoading(false);
            loadUserProfile(session.user.id);
          }
        } else {
          console.log('AuthContext: Nenhuma sessão válida encontrada');
          await supabase.auth.signOut(); // Garantir limpeza completa
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('AuthContext: Erro na inicialização:', error);
        await supabase.auth.signOut(); // Limpar em caso de erro
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
        console.log('AuthContext: Login detectado, validando sessão:', session.user.email);
        setUser(session.user);
        setLoading(false);
        loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('AuthContext: Logout detectado, limpando dados');
        setUser(null);
        setProfile(null);
        if (mounted) setLoading(false);
      } else if (!session) {
        console.log('AuthContext: Sem sessão válida, limpando dados');
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
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Tentativa de login para:', email);
      
      // Limpar qualquer sessão anterior primeiro
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthContext: Erro no login:', error.message);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        console.log('AuthContext: Login bem-sucedido para:', email);
        return { success: true };
      } else {
        console.error('AuthContext: Login sem retornar dados válidos');
        return { success: false, error: 'Login falhou - dados inválidos' };
      }
    } catch (error) {
      console.error('AuthContext: Exceção no login:', error);
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
