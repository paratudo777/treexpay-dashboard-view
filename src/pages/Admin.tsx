
import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, UserCheck, UserX, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

export default function Admin() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    profile: 'user' as 'admin' | 'user',
    depositFee: '0',
    withdrawalFee: '0'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users from Supabase
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      return data as User[];
    }
  });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Todos os campos são obrigatórios.",
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('Creating user with Supabase Auth...');
      
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: { 
          name: newUser.name 
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast({
          variant: "destructive",
          title: "Erro ao criar usuário",
          description: authError.message,
        });
        return;
      }

      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha na criação do usuário.",
        });
        return;
      }

      console.log('User created in Auth, updating profile...');

      // 2. Update the profile created by the trigger
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          profile: newUser.profile,
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao atualizar perfil do usuário.",
        });
        return;
      }

      console.log('Profile updated, creating settings...');

      // 3. Create or update settings
      const { data: existingSettings } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (!existingSettings) {
        const { error: settingsError } = await supabase
          .from('settings')
          .insert({
            user_id: authData.user.id,
            deposit_fee: parseFloat(newUser.depositFee) || 0,
            withdrawal_fee: parseFloat(newUser.withdrawalFee) || 0
          });

        if (settingsError) {
          console.error('Settings creation error:', settingsError);
          // Don't fail the whole process for settings error, just log it
          console.log('Settings creation failed but user was created successfully');
        }
      } else {
        const { error: settingsUpdateError } = await supabase
          .from('settings')
          .update({
            deposit_fee: parseFloat(newUser.depositFee) || 0,
            withdrawal_fee: parseFloat(newUser.withdrawalFee) || 0
          })
          .eq('user_id', authData.user.id);

        if (settingsUpdateError) {
          console.error('Settings update error:', settingsUpdateError);
        }
      }

      // 4. Clear form and close dialog
      setNewUser({ 
        name: '', 
        email: '', 
        password: '', 
        profile: 'user',
        depositFee: '0',
        withdrawalFee: '0'
      });
      setIsCreateDialogOpen(false);
      
      // 5. Refresh the users list
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      
      toast({
        title: "Usuário criado com sucesso",
        description: `${newUser.name} foi criado e está ativo.`,
      });

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao atualizar status do usuário.",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      
      const user = users.find(u => u.id === userId);
      toast({
        title: "Status atualizado",
        description: `${user?.name} foi ${currentStatus ? 'desativado' : 'ativado'}.`,
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    }
  };

  const resetPassword = async (userId: string, userEmail: string) => {
    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao resetar senha.",
        });
        return;
      }

      toast({
        title: "Senha resetada",
        description: `Nova senha temporária: ${tempPassword}`,
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administração de Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie usuários, permissões e acessos da plataforma
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-treexpay-dark hover:bg-treexpay-medium">
                <Plus className="mr-2 h-4 w-4" />
                Criar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo usuário. Ele será criado e ativado automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="profile" className="text-right">
                    Perfil
                  </Label>
                  <Select value={newUser.profile} onValueChange={(value) => setNewUser({ ...newUser, profile: value as 'admin' | 'user' })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="depositFee" className="text-right">
                    Taxa Depósito (%)
                  </Label>
                  <Input
                    id="depositFee"
                    type="number"
                    step="0.01"
                    value={newUser.depositFee}
                    onChange={(e) => setNewUser({ ...newUser, depositFee: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="withdrawalFee" className="text-right">
                    Taxa Saque (%)
                  </Label>
                  <Input
                    id="withdrawalFee"
                    type="number"
                    step="0.01"
                    value={newUser.withdrawalFee}
                    onChange={(e) => setNewUser({ ...newUser, withdrawalFee: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleCreateUser}
                  disabled={loading || !newUser.name || !newUser.email || !newUser.password}
                >
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Gerencie todos os usuários da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="text-muted-foreground">Carregando usuários...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.profile === 'admin' ? 'default' : 'secondary'}>
                          {user.profile === 'admin' ? 'Admin' : 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'destructive'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {user.balance.toFixed(2)}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, user.active)}
                          >
                            {user.active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetPassword(user.id, user.email)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
