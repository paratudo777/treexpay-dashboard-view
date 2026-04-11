
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, UserCheck, UserX, RotateCcw, DollarSign, Eye, Trash2, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BalanceAdjustmentModal } from '@/components/admin/BalanceAdjustmentModal';
import { FeeEditInput } from '@/components/admin/FeeEditInput';
import { NetBalanceDisplay } from '@/components/admin/NetBalanceDisplay';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface User {
  id: string;
  name: string;
  email: string;
  profile: 'admin' | 'user';
  active: boolean;
  created_at: string;
  balance: number;
}

interface UserSettings {
  deposit_fee: number;
  withdrawal_fee: number;
}

interface UserWithSettings extends User {
  settings: UserSettings | null;
}

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [userDetailsTarget, setUserDetailsTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, settings (deposit_fee, withdrawal_fee)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(user => {
        let settings = null;
        if (user.settings) {
          if (Array.isArray(user.settings) && user.settings.length > 0) {
            settings = user.settings[0];
          } else if (!Array.isArray(user.settings)) {
            settings = user.settings;
          }
        }
        return { ...user, settings };
      }) as UserWithSettings[];
    }
  });

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'toggle_status', userId, active: !currentStatus }
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Erro", description: data?.error || "Erro ao atualizar status." });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      const user = users.find(u => u.id === userId);
      toast({ title: "Status atualizado", description: `${user?.name} foi ${currentStatus ? 'desativado' : 'ativado'}.` });
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Erro interno." });
    }
  };

  const resetPassword = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'reset_password', userId }
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Erro", description: data?.error || "Erro ao resetar senha." });
        return;
      }
      toast({ title: "Senha resetada", description: `Nova senha temporária: ${data.tempPassword}` });
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Erro interno." });
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'delete_user', userId: deleteTarget.id, deleteUser: true }
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Erro", description: data?.error || "Erro ao excluir." });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Usuário excluído", description: `${deleteTarget.name} foi excluído permanentemente.` });
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Erro interno." });
    } finally {
      setDeleteTarget(null);
    }
  };

  const updateUserFee = async (userId: string, feeType: 'deposit_fee' | 'withdrawal_fee', newValue: number): Promise<boolean> => {
    try {
      const { data: existingSettings } = await supabase
        .from('settings').select('*').eq('user_id', userId).maybeSingle();

      let result;
      if (!existingSettings) {
        result = await supabase.from('settings').insert({
          user_id: userId,
          deposit_fee: feeType === 'deposit_fee' ? newValue : 0,
          withdrawal_fee: feeType === 'withdrawal_fee' ? newValue : 0
        });
      } else {
        result = await supabase.from('settings').update({ [feeType]: newValue }).eq('user_id', userId);
      }

      if (result.error) {
        toast({ variant: "destructive", title: "Erro", description: "Erro ao atualizar taxa." });
        return false;
      }

      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Taxa atualizada", description: `Taxa de ${feeType === 'deposit_fee' ? 'depósito' : 'saque'} atualizada para ${newValue}%.` });
      return true;
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Erro interno." });
      return false;
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
              <p className="text-sm text-muted-foreground">{users.length} usuários cadastrados</p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card/50 border-border/50 focus:border-primary/50"
            />
          </div>
        </div>

        {/* Users Table */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/30 pb-4">
            <CardTitle className="text-lg">Usuários</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Carregando usuários...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground">
                {searchTerm ? 'Nenhum usuário encontrado para essa busca.' : 'Nenhum usuário cadastrado.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nome</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">E-mail</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Taxa Dep.</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Taxa Saq.</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Saldo</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Criado em</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, i) => {
                      const depositFee = user.settings?.deposit_fee ?? 0;
                      const withdrawalFee = user.settings?.withdrawal_fee ?? 0;
                      return (
                        <TableRow 
                          key={user.id} 
                          className="border-border/20 hover:bg-primary/5 transition-colors duration-200"
                          style={{ animationDelay: `${i * 30}ms` }}
                        >
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.profile === 'admin' ? 'default' : 'secondary'} className="text-xs">
                              {user.profile === 'admin' ? 'Admin' : 'Usuário'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={user.active 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs' 
                                : 'bg-red-500/20 text-red-400 border-red-500/30 text-xs'}
                            >
                              {user.active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <FeeEditInput currentValue={depositFee} onUpdate={(v) => updateUserFee(user.id, 'deposit_fee', v)} feeType="deposit_fee" />
                          </TableCell>
                          <TableCell>
                            <FeeEditInput currentValue={withdrawalFee} onUpdate={(v) => updateUserFee(user.id, 'withdrawal_fee', v)} feeType="withdrawal_fee" />
                          </TableCell>
                          <TableCell>
                            <NetBalanceDisplay userId={user.id} grossBalance={user.balance} depositCount={0} />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => { setUserDetailsTarget(user); setIsUserDetailsModalOpen(true); }} title="Detalhes">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-500/10 hover:text-emerald-400" onClick={() => { setSelectedUser(user); setIsBalanceModalOpen(true); }} title="Ajustar saldo">
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-400" onClick={() => toggleUserStatus(user.id, user.active)} title={user.active ? "Desativar" : "Ativar"}>
                                {user.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-400" onClick={() => resetPassword(user.id)} title="Resetar senha">
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeleteTarget(user)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <BalanceAdjustmentModal
          user={selectedUser}
          isOpen={isBalanceModalOpen}
          onClose={() => { setIsBalanceModalOpen(false); setSelectedUser(null); }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        />
        <UserDetailsModal
          user={userDetailsTarget}
          isOpen={isUserDetailsModalOpen}
          onClose={() => { setIsUserDetailsModalOpen(false); setUserDetailsTarget(null); }}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent className="border-border/50 bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteUser} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
