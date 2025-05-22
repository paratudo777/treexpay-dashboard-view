
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { z } from 'zod';
import { MessageSquareHelp } from 'lucide-react';

const registerSchema = z.object({
  login: z.string().min(3, "Login deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  keyCode: z.string().min(6, "Código-chave deve ter pelo menos 6 caracteres"),
});

export default function Register() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [keyCode, setKeyCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateForm = () => {
    try {
      registerSchema.parse({ login, password, keyCode });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulação de registro
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você já pode fazer login na plataforma.",
      });
      
      // Redirecionar para login após cadastro bem sucedido
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: "Ocorreu um erro ao tentar cadastrar. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/5518991913165', '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark">
      <div className="w-full max-w-md p-4">
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-treexpay-medium">Cadastro TreexPay</CardTitle>
            <CardDescription>Crie sua conta na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Login</Label>
                <Input
                  id="login"
                  type="text"
                  placeholder="Seu login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className={errors.login ? "border-destructive" : ""}
                />
                {errors.login && (
                  <p className="text-sm font-medium text-destructive">{errors.login}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm font-medium text-destructive">{errors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyCode">Código-chave</Label>
                <Input
                  id="keyCode"
                  type="text"
                  placeholder="Seu código de acesso"
                  value={keyCode}
                  onChange={(e) => setKeyCode(e.target.value)}
                  className={errors.keyCode ? "border-destructive" : ""}
                />
                {errors.keyCode && (
                  <p className="text-sm font-medium text-destructive">{errors.keyCode}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Recebeu seu código via WhatsApp? Se não tiver um código, clique no botão "Falar com o Suporte".
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-treexpay-dark hover:bg-treexpay-medium text-white"
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Cadastrar'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-muted-foreground w-full text-center">
              Já tem uma conta?{" "}
              <Link to="/" className="text-treexpay-medium hover:underline">
                Faça login
              </Link>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={openWhatsApp}
            >
              <MessageSquareHelp className="mr-2 h-4 w-4" />
              Falar com o Suporte
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
