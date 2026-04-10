
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Zap, Code2, HeadphonesIcon, QrCode, Shield, BarChart3, Globe, CreditCard, ArrowRight, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import dashboardPreview from '@/assets/dashboard-preview.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
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
    <div className="min-h-screen dark" style={{ background: 'hsl(260 25% 4%)' }}>
      {/* Animated orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-orb login-orb-4" />
        <div className="login-orb login-orb-5" />
      </div>

      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md border-b border-border/20" style={{ background: 'hsl(260 25% 4% / 0.8)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-primary tracking-tight">TreexPay</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setShowLoginModal(true)}>
            Entrar
          </Button>
          <Button className="rounded-xl" onClick={handleCreateAccount}>
            Criar conta
          </Button>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Gateway de Pagamentos PIX
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight mb-6 leading-tight">
            A gateway de pagamentos<br />
            <span className="text-primary">mais simples do Brasil</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Receba pagamentos via PIX de forma rápida, segura e com as menores taxas do mercado. 
            Integração em minutos, suporte direto com desenvolvedores.
          </p>
          <div className="flex items-center justify-center gap-4 mb-16">
            <Button size="lg" className="rounded-xl text-base px-8 gap-2" onClick={() => setShowLoginModal(true)}>
              Acessar Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl text-base px-8" onClick={handleCreateAccount}>
              Criar conta
            </Button>
          </div>

          {/* Dashboard Screenshot */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-3xl opacity-30" />
            <div className="relative glass-card rounded-2xl border border-border/30 overflow-hidden shadow-2xl">
              <img
                src={dashboardPreview}
                alt="Preview da dashboard TreexPay"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== TAXAS SECTION ===== */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
              <CreditCard className="w-4 h-4" />
              Taxas competitivas
            </div>
            <h3 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
              Taxas baixas e <span className="text-primary">transparentes</span>
            </h3>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Sem surpresas. Você sabe exatamente quanto paga por cada transação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: QrCode,
                title: 'PIX Instantâneo',
                description: 'Receba pagamentos via PIX em tempo real, 24/7, sem esperar compensação.',
              },
              {
                icon: Shield,
                title: 'Segurança Total',
                description: 'Criptografia de ponta a ponta, validação de webhooks com HMAC SHA-256.',
              },
              {
                icon: BarChart3,
                title: 'Dashboard Completa',
                description: 'Acompanhe vendas, saques, ticket médio e status em tempo real.',
              },
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-2xl p-8 border border-border/30 hover:border-primary/40 transition-all duration-300 group">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-5 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">{item.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INTEGRAÇÃO SECTION ===== */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
                <Code2 className="w-4 h-4" />
                Fácil integração
              </div>
              <h3 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight mb-6">
                Integre em <span className="text-primary">minutos</span>
              </h3>
              <p className="text-lg text-muted-foreground mb-8">
                Nossa API é simples, bem documentada e pronta para uso. 
                Basta gerar sua chave e começar a receber pagamentos.
              </p>
              <ul className="space-y-4">
                {[
                  'API RESTful completa e documentada',
                  'Webhooks em tempo real para cada transação',
                  'SDKs e exemplos prontos para usar',
                  'Suporte direto com desenvolvedores',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Code Preview */}
            <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="text-xs text-muted-foreground ml-2 font-mono">criar-pagamento.sh</span>
              </div>
              <pre className="p-6 text-sm font-mono text-muted-foreground overflow-x-auto leading-relaxed">
<span className="text-primary">curl</span> -X POST \{'\n'}
  https://api.treexpay.com/v1/payments \{'\n'}
  -H <span className="text-green-400">"x-api-key: sk_live_..."</span> \{'\n'}
  -H <span className="text-green-400">"Content-Type: application/json"</span> \{'\n'}
  -d <span className="text-green-400">'{`{`}</span>{'\n'}
    <span className="text-green-400">"amount": 99.90,</span>{'\n'}
    <span className="text-green-400">"description": "Pedido #1234"</span>{'\n'}
  <span className="text-green-400">{`}`}'</span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-6">
            Pronto para começar?
          </h3>
          <p className="text-lg text-muted-foreground mb-10">
            Crie sua conta agora e comece a receber pagamentos PIX em poucos minutos.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="rounded-xl text-base px-8 gap-2" onClick={handleCreateAccount}>
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl text-base px-8" onClick={() => setShowLoginModal(true)}>
              Já tenho conta
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2025 TreexPay. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4" />
            treexpay.com
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md glass-card border-border/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary text-center">TreexPay</DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Entre com suas credenciais para acessar a plataforma
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
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
            <Button type="submit" className="w-full rounded-xl" size="lg" disabled={isLoggingIn}>
              {isLoggingIn ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
