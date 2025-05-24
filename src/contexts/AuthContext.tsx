
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  email: string;
  name: string;
  profile: 'admin' | 'user';
  status: 'active' | 'inactive';
  balance: number;
  createdAt: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log('AuthProvider - current user:', user, 'isLoading:', isLoading);

  // Mock user data
  const mockUsers = {
    'admin@treexpay.com': {
      id: 'mock-admin-id',
      email: 'admin@treexpay.com',
      name: 'Administrador',
      profile: 'admin' as const,
      status: 'active' as const,
      balance: 5000.00,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLogin: new Date().toISOString(),
    },
    'user@treexpay.com': {
      id: 'mock-user-id',
      email: 'user@treexpay.com',
      name: 'Usuário Teste',
      profile: 'user' as const,
      status: 'active' as const,
      balance: 1000.00,
      createdAt: '2024-01-01T00:00:00.000Z',
      lastLogin: new Date().toISOString(),
    }
  };

  // Check for existing mock session on mount
  useEffect(() => {
    console.log('Initializing mock auth...');
    
    const mockUserData = localStorage.getItem('mock_user');
    if (mockUserData) {
      try {
        const userData = JSON.parse(mockUserData);
        console.log('Found existing mock session:', userData);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing mock user data:', error);
        localStorage.removeItem('mock_user');
      }
    }
    
    console.log('Mock auth initialization complete, setting isLoading to false');
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting mock login for:', email);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock authentication logic
      if ((email === 'admin@treexpay.com' && password === '1@2s3D') ||
          (email === 'user@treexpay.com' && password === '123456')) {
        
        const userData = mockUsers[email as keyof typeof mockUsers];
        
        // Store in localStorage
        localStorage.setItem('mock_user', JSON.stringify(userData));
        setUser(userData);
        
        console.log('Mock login successful, navigating to dashboard...');
        
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo à plataforma TreexPay (Modo de desenvolvimento)",
        });
        
        navigate('/dashboard');
      } else {
        throw new Error('Credenciais inválidas');
      }
    } catch (error: any) {
      console.error('Mock login error:', error);
      
      toast({
        variant: "destructive",
        title: "Erro de login",
        description: error.message || "Email ou senha incorretos",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting mock signup for:', email);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Cadastro simulado",
        description: "Em modo de desenvolvimento. Use admin@treexpay.com ou user@treexpay.com para testar.",
      });
    } catch (error: any) {
      console.error('Mock sign up error:', error);
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "Funcionalidade disponível apenas em produção",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Mock logging out...');
      setIsLoading(true);
      
      // Remove from localStorage
      localStorage.removeItem('mock_user');
      setUser(null);
      navigate('/');
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Até logo! (Modo de desenvolvimento)",
      });
    } catch (error: any) {
      console.error('Mock logout error:', error);
      toast({
        variant: "destructive",
        title: "Erro no logout",
        description: error.message || "Erro ao fazer logout",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isAdmin: user?.profile === 'admin',
      isLoading,
      login, 
      logout,
      signUp
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
