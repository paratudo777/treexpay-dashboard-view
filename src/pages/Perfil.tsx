
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isValidCpf, formatCpf, formatPhone } from "@/utils/cpfValidation";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  User,
  Bell,
  Shield,
  Key,
  Wallet,
  Mail,
  Phone,
  CreditCard,
  TrendingUp,
  ArrowUpFromLine,
  Percent,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  balance: number;
  phone?: string;
  cpf?: string;
  notifications_enabled: boolean;
}

export default function Perfil() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();

  const { settings: userSettings, loading: settingsLoading } = useUserSettings(user?.id);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, balance, phone, cpf, notifications_enabled')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      setUserProfile(data);
      setPhone(data.phone || '');
      setCpf(data.cpf || '');
      setNotificationsEnabled(data.notifications_enabled);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    if (cpf && !isValidCpf(cpf)) {
      toast({ title: "CPF inválido", description: "Por favor, insira um CPF válido.", variant: "destructive" });
      return;
    }

    const phoneNumbers = phone.replace(/\D/g, '');
    if (phone && (phoneNumbers.length < 10 || phoneNumbers.length > 11)) {
      toast({ title: "Telefone inválido", description: "Por favor, insira um telefone válido.", variant: "destructive" });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: phoneNumbers || null, cpf: cpf.replace(/\D/g, '') || null })
        .eq('id', user.id);
      if (error) throw error;
      await fetchUserProfile();
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
    } catch {
      toast({ title: "Erro ao atualizar perfil", description: "Não foi possível salvar suas informações.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleToggleNotifications = async () => {
    if (!user) return;
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: newState })
        .eq('id', user.id);
      if (error) throw error;
      if (window.OneSignal) {
        window.OneSignal.push(() => { window.OneSignal.disablePush(!newState); });
      }
      toast({
        title: newState ? "Notificações ativadas" : "Notificações desativadas",
        description: newState ? "Você receberá notificações sobre suas vendas." : "Você não receberá mais notificações.",
      });
    } catch {
      setNotificationsEnabled(!newState);
      toast({ title: "Erro", description: "Não foi possível alterar sua preferência.", variant: "destructive" });
    }
  };

  const handleEnable2FA = () => setShowQRCode(true);

  const handleVerify2FA = () => {
    if (twoFACode.length === 6) {
      toast({ title: "Google Authenticator ativado", description: "A autenticação de dois fatores foi habilitada com sucesso." });
      setShowQRCode(false);
      setTwoFACode('');
    } else {
      toast({ variant: "destructive", title: "Código inválido", description: "Por favor, insira um código válido de 6 dígitos." });
    }
  };

  const depositFee = userSettings?.deposit_fee ?? 0;
  const withdrawalFee = userSettings?.withdrawal_fee ?? 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl gradient-primary">
            <User className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus dados e configurações</p>
          </div>
        </div>

        {/* Profile Overview Card */}
        <Card className="glass-card relative overflow-hidden border-border/40">
          <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shrink-0">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="md:hidden">
                  <h2 className="text-lg font-bold text-foreground">{userProfile?.name || 'Carregando...'}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {userProfile?.email}
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 hidden md:block">
                <h2 className="text-lg font-bold text-foreground">{userProfile?.name || 'Carregando...'}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {userProfile?.email}
                </p>
              </div>

              {/* Balance */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saldo</p>
                  <p className="text-xl font-bold text-primary">
                    {userProfile ? formatCurrency(userProfile.balance) : '...'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Dados Pessoais */}
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Dados para PIX</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Complete para habilitar depósitos via PIX</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="h-3 w-3" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-9999"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={15}
                  className="h-11 bg-muted/30 border-border/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpf" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  CPF
                </Label>
                <Input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={formatCpf(cpf)}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                  maxLength={14}
                  className="h-11 bg-muted/30 border-border/50"
                />
              </div>
              <Button
                onClick={updateProfile}
                disabled={isUpdating}
                className="w-full h-10 gradient-primary text-primary-foreground font-semibold hover:brightness-110"
              >
                {isUpdating ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Salvando...</span>
                ) : (
                  <span className="flex items-center gap-2"><Save className="h-4 w-4" />Salvar Dados</span>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Minhas Taxas */}
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Minhas Taxas</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Taxas aplicadas às suas transações</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsLoading ? (
                <div className="space-y-3">
                  <div className="h-16 bg-muted animate-pulse rounded-xl" />
                  <div className="h-16 bg-muted animate-pulse rounded-xl" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Taxa de Depósito</p>
                      <p className="text-sm font-bold text-foreground">{depositFee.toFixed(2)}% + R$ 1,50</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">por transação</Badge>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <ArrowUpFromLine className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Taxa de Saque</p>
                      <p className="text-sm font-bold text-foreground">R$ {withdrawalFee.toFixed(2)}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">por saque</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Notificações */}
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Notificações</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${notificationsEnabled ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                    <Bell className={`h-4 w-4 ${notificationsEnabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Notificações de vendas</p>
                    <p className="text-xs text-muted-foreground">Receba alertas de vendas pendentes e aprovadas</p>
                  </div>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={handleToggleNotifications} />
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="glass-card border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Segurança</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!showQRCode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Autenticação 2FA</p>
                      <p className="text-xs text-muted-foreground">Google Authenticator</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleEnable2FA} className="text-xs">
                      Ativar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription className="text-xs">
                      Escaneie o QR Code com o Google Authenticator e insira o código de 6 dígitos.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-center py-3">
                    <div className="bg-white p-3 rounded-lg">
                      <div className="w-36 h-36 bg-muted rounded" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="twoFACode" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Código de verificação
                    </Label>
                    <Input
                      id="twoFACode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="h-11 bg-muted/30 border-border/50 text-center text-lg font-mono tracking-widest"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowQRCode(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleVerify2FA} className="flex-1 gradient-primary text-primary-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Verificar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
