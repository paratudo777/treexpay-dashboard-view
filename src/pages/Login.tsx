
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Zap, Code2, HeadphonesIcon, QrCode, Monitor } from 'lucide-react';

const benefits = [
  { icon: Zap, text: 'Taxas baixas e competitivas' },
  { icon: Code2, text: 'Integração fácil via API' },
  { icon: HeadphonesIcon, text: 'Suporte direto com desenvolvedores' },
  { icon: QrCode, text: 'Ideal para quem trabalha com pagamentos PIX' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, loading, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(isAdmin ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, isAdmin, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Campos obrigatórios', description: 'Por favor, preencha email e senha.', variant: 'destructive' });
      return;
    }
    setIsLoggingIn(true);
    const result = await login(email, password);
    if (result.success) {
      toast({ title: 'Login realizado!', description: 'Redirecionando...' });
    } else {
      toast({ title: 'Erro no login', description: result.error || 'Verifique suas credenciais.', variant: 'destructive' });
      setIsLoggingIn(false);
    }
  };

  const handleCreateAccount = () => {
    window.open('https://wa.me/5518991913165', '_blank');
  };

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">
            {loading ? 'Verificando autenticação...' : 'Redirecionando...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center dark relative overflow-hidden" style={{ background: 'hsl(260 25% 4%)' }}>
      {/* Animated glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-orb login-orb-4" />
        <div className="login-orb login-orb-5" />
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 relative z-10 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* Left — Login Card */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="glass-card rounded-2xl p-8 shadow-2xl border border-border/30">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">TreexPay</h1>
                <p className="text-sm text-muted-foreground">
                  Entre com suas credenciais para acessar a plataforma
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider">E-MAIL</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoggingIn}
                    className="bg-muted/50 border-border/60 focus:border-primary focus:ring-primary/20 transition-all h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider">SENHA</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoggingIn}
                    className="bg-muted/50 border-border/60 focus:border-primary focus:ring-primary/20 transition-all h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Button type="submit" className="w-full rounded-xl" size="lg" disabled={isLoggingIn}>
                    {isLoggingIn ? 'Entrando...' : 'Entrar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    size="lg"
                    onClick={handleCreateAccount}
                  >
                    Criar conta
                  </Button>
                </div>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-6">
                © 2025 TreexPay. Todos os direitos reservados.
              </p>
            </div>
          </div>

          {/* Right — Benefits + Preview */}
          <div className="hidden lg:flex flex-col gap-6">
            {/* Benefits */}
            <div className="glass-card rounded-2xl p-6 border border-border/30">
              <h2 className="text-lg font-semibold text-foreground mb-4">Por que escolher a TreexPay?</h2>
              <ul className="space-y-4">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
                      <b.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm text-muted-foreground">{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Dashboard Preview Placeholder */}
            <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
              <div className="relative w-full aspect-video bg-muted/30 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                <Monitor className="w-10 h-10 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground/60 font-medium">Preview da plataforma</span>
              </div>
            </div>
          </div>

          {/* Mobile benefits (below card) */}
          <div className="lg:hidden w-full max-w-md mx-auto">
            <div className="glass-card rounded-2xl p-5 border border-border/30">
              <ul className="space-y-3">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                      <b.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-muted-foreground">{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
