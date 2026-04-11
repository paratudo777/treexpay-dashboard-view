import { DashboardLayout } from '@/components/DashboardLayout';
import { useAcquirerConfig, AVAILABLE_ACQUIRERS } from '@/hooks/useAcquirerConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, User, Zap, Search, Shield, ArrowRightLeft } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function AdminAcquirers() {
  const { globalProvider, userConfigs, users, loading, saving, updateGlobalProvider, setUserProvider } = useAcquirerConfig();
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, search]);

  const getUserProvider = (userId: string) => {
    return userConfigs.find(c => c.user_id === userId)?.provider || null;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Adquirentes</h1>
            <p className="text-sm text-muted-foreground">Gerencie adquirentes globais e por usuário</p>
          </div>
        </div>

        {/* Global Config */}
        <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Adquirente Padrão (Global)</CardTitle>
            </div>
            <CardDescription>
              Todos os usuários sem configuração individual usarão esta adquirente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_ACQUIRERS.map(acq => (
                <button
                  key={acq.id}
                  disabled={saving || !acq.available}
                  onClick={() => acq.available && updateGlobalProvider(acq.name)}
                  className={cn(
                    "relative flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 transition-all duration-200",
                    globalProvider === acq.name
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : acq.available
                        ? "border-border hover:border-primary/50 hover:bg-primary/5"
                        : "border-border/40 opacity-50 cursor-not-allowed"
                  )}
                >
                  <Zap className={cn("h-5 w-5", globalProvider === acq.name ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-left">
                    <div className="font-semibold text-foreground">{acq.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {acq.available ? 'Disponível' : 'Em breve'}
                    </div>
                  </div>
                  {globalProvider === acq.name && (
                    <Badge className="ml-2 bg-primary/20 text-primary border-primary/30 text-xs">
                      Ativa
                    </Badge>
                  )}
                  {!acq.available && (
                    <Badge variant="outline" className="ml-2 text-xs opacity-70">
                      Breve
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Per-user Config */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Configuração por Usuário</CardTitle>
            </div>
            <CardDescription>
              Defina adquirentes individuais. Usuários sem configuração usam a global.
            </CardDescription>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredUsers.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum usuário encontrado</p>
              )}
              {filteredUsers.map(user => {
                const userProv = getUserProvider(user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-background/30 hover:bg-background/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground text-sm truncate">{user.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={userProv || '_global'}
                        onValueChange={val => setUserProvider(user.id, val === '_global' ? null : val)}
                        disabled={saving}
                      >
                        <SelectTrigger className="w-[160px] h-9 text-sm bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_global">
                            <span className="flex items-center gap-1.5">
                              <Globe className="h-3.5 w-3.5" />
                              Global ({AVAILABLE_ACQUIRERS.find(a => a.name === globalProvider)?.label})
                            </span>
                          </SelectItem>
                          {AVAILABLE_ACQUIRERS.filter(a => a.available).map(acq => (
                            <SelectItem key={acq.id} value={acq.name}>
                              <span className="flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5" />
                                {acq.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {userProv && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                          Custom
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
