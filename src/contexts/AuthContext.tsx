
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in (from localStorage)
  React.useEffect(() => {
    const storedUser = localStorage.getItem('treexpay_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // This is a mock authentication
    // In a real application, you would call an API
    if (email && password) {
      // Mock successful login
      const mockUser = {
        email,
        name: 'Usuário TreexPay',
      };
      
      // Store user in state and localStorage
      setUser(mockUser);
      localStorage.setItem('treexpay_user', JSON.stringify(mockUser));
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo à plataforma TreexPay",
      });
      
      // Redirect to dashboard
      navigate('/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "Erro de login",
        description: "Email e senha são obrigatórios",
      });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('treexpay_user');
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
