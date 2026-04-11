
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, Users, ShieldCheck, UserCheck as UserCheckIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BalanceAdjustmentModal } from '@/components/admin/BalanceAdjustmentModal';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';
import { UserCard } from '@/components/admin/UserCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface User {
  id: string;
  name: string;
  email: string;
  profile: 'admin' | 'user';
  active: boolean;
  created_at: string;
  updated_at: string;
  balance: number;
}

interface UserSettings {
  deposit_fee: number;
  withdrawal_fee: number;
}

interface UserWithSettings extends User {
  settings: UserSettings | null;
}

type FilterType = 'all' | 'admin' | 'user' | 'active' | 'inactive';

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
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

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (filter) {
      case 'admin': return u.profile === 'admin';
      case 'user': return u.profile === 'user';
      case 'active': return u.active;
      case 'inactive': return !u.active;
      default: return true;
    }
  });

  const adminCount = users.filter(u => u.profile === 'admin').length;
  const activeCount = users.filter(u => u.active).length;

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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl gradient-primary">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Gerenciamento de Usuários</h1>
              <p className="text-sm text-muted-foreground">{users.length} usuários cadastrados</p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1 px-2.5 py-1">
              <Users className="h-3 w-3" />
              {users.length} total
            </Badge>
            <Badge className="bg-primary/15 text-primary border-primary/20 gap-1 px-2.5 py-1">
              <ShieldCheck className="h-3 w-3" />
              {adminCount} admins
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 gap-1 px-2.5 py-1">
              <UserCheckIcon className="h-3 w-3" />
              {activeCount} ativos
            </Badge>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/50 border-border/50 focus:border-primary/50 h-10"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="w-full sm:w-44 bg-card/50 border-border/50 h-10">
                <SelectValue placeholder="Filtrar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="user">Usuários</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* User Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Carregando usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-muted/50 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">
              {searchTerm || filter !== 'all' ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Tente outra busca' : 'Crie o primeiro usuário para começar'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onViewDetails={() => { setUserDetailsTarget(user); setIsUserDetailsModalOpen(true); }}
                onAdjustBalance={() => { setSelectedUser(user); setIsBalanceModalOpen(true); }}
                onToggleStatus={() => toggleUserStatus(user.id, user.active)}
                onResetPassword={() => resetPassword(user.id)}
                onDelete={() => setDeleteTarget(user)}
                onUpdateFee={(feeType, value) => updateUserFee(user.id, feeType, value)}
              />
            ))}
          </div>
        )}

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
