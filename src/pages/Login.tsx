
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  console.log('Login: Estado de auth:', { isAuthenticated, isAdmin, loading });

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('Login: Usuário já autenticado, redirecionando...');
      if (isAdmin) {
        console.log('Login: Redirecionando admin para /admin');
        navigate('/admin');
      } else {
        console.log('Login: Redirecionando usuário para /dashboard');
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, isAdmin, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha.",
        variant: "destructive",
      });
      return;
    }

    console.log('Login: Tentando fazer login com:', email);

    const result = await login(email, password);
    
    console.log('Login: Resultado do login:', result);
    
    if (result.success) {
      toast({
        title: "Login realizado!",
        description: "Redirecionando...",
      });
      
      // O redirecionamento será feito pelo useEffect quando isAuthenticated mudar
    } else {
      console.error('Login: Falha no login:', result.error);
      toast({
        title: "Erro no login",
        description: result.error || "Verifique suas credenciais.",
        variant: "destructive",
      });
    }
  };

  // Se já estiver autenticado, não mostrar o formulário
  if (isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-treexpay-medium"></div>
          <p className="text-sm text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark">
      <div className="w-full max-w-md p-4">
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-treexpay-medium">TreexPay</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar a plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-input"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-treexpay-dark hover:bg-treexpay-medium text-white"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <p className="text-sm text-muted-foreground text-center">
              © 2025 TreexPay. Todos os direitos reservados.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
