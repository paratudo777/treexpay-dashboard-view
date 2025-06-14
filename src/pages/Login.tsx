
import { useState } from 'react';
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

  // Debug: mostrar estado atual
  console.log('Login: Estado de auth:', { isAuthenticated, isAdmin, loading });

  // Se já está autenticado, redirecionar
  if (isAuthenticated && !loading) {
    console.log('Login: Usuário já autenticado, redirecionando...');
    if (isAdmin) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
    return null;
  }

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
    console.log('Login: Senha fornecida tem', password.length, 'caracteres');

    const result = await login(email, password);
    
    console.log('Login: Resultado do login:', result);
    
    if (result.success) {
      toast({
        title: "Login realizado!",
        description: "Redirecionando...",
      });
      
      // Aguardar um pouco para o contexto processar
      setTimeout(() => {
        console.log('Login: Verificando redirecionamento após login bem-sucedido');
        if (email === 'manomassa717@gmail.com' || email === 'admin@treexpay.com') {
          console.log('Login: Redirecionando admin para /admin');
          navigate('/admin');
        } else {
          console.log('Login: Redirecionando usuário para /dashboard');
          navigate('/dashboard');
        }
      }, 1000);
    } else {
      console.error('Login: Falha no login:', result.error);
      toast({
        title: "Erro no login",
        description: result.error || "Verifique suas credenciais.",
        variant: "destructive",
      });
    }
  };

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
            
            {/* Debug info - remover em produção */}
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
              <p>Debug: loading={loading.toString()}</p>
              <p>Debug: isAuthenticated={isAuthenticated.toString()}</p>
              <p>Debug: isAdmin={isAdmin.toString()}</p>
            </div>
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
