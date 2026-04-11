
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminCreateUser() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    profile: 'user' as 'admin' | 'user',
    depositFee: '0',
    withdrawalFee: '0',
    initialBalance: '0',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = (pw: string) => pw.length >= 6;

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos obrigatórios." });
      return;
    }
    if (!isEmailValid(form.email)) {
      toast({ variant: "destructive", title: "E-mail inválido", description: "Insira um e-mail válido." });
      return;
    }
    if (!isPasswordValid(form.password)) {
      toast({ variant: "destructive", title: "Senha fraca", description: "A senha deve ter no mínimo 6 caracteres." });
      return;
    }
    if (!isAdmin) {
      toast({ variant: "destructive", title: "Erro", description: "Sem permissão." });
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          profile: form.profile,
          depositFee: form.depositFee,
          withdrawalFee: form.withdrawalFee,
        }
      });

      if (error || data?.error) {
        toast({ variant: "destructive", title: "Erro ao criar", description: data?.error || "Erro interno." });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccess(true);
      toast({ title: "Usuário criado!", description: data.message });
      setForm({ name: '', email: '', password: '', profile: 'user', depositFee: '0', withdrawalFee: '0', initialBalance: '0' });
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Erro interno." });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Criar Novo Usuário</h1>
            <p className="text-sm text-muted-foreground">Cadastre um novo usuário na plataforma</p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Dados do Usuário</CardTitle>
            <CardDescription>Preencha os campos abaixo. Campos com * são obrigatórios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Nome completo" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@exemplo.com" className="bg-background/50" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Perfil</Label>
                <Select value={form.profile} onValueChange={v => update('profile', v)}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa de Depósito (%)</Label>
                <Input type="number" step="0.01" value={form.depositFee} onChange={e => update('depositFee', e.target.value)} className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Saque (%)</Label>
                <Input type="number" step="0.01" value={form.withdrawalFee} onChange={e => update('withdrawalFee', e.target.value)} className="bg-background/50" />
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <Button
                onClick={handleCreate}
                disabled={loading || !form.name || !form.email || !form.password}
                className="gradient-primary hover:brightness-110 min-w-[180px]"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>
                ) : success ? (
                  <><CheckCircle className="h-4 w-4 mr-2" />Criado com sucesso!</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Criar Usuário</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
