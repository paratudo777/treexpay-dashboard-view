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
import { useToast } from '@/hooks/use-toast';
import { Plus, UserCheck, UserX, RotateCcw, DollarSign, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BalanceAdjustmentModal } from '@/components/admin/BalanceAdjustmentModal';
import { FeeEditInput } from '@/components/admin/FeeEditInput';
import { NetBalanceDisplay } from '@/components/admin/NetBalanceDisplay';

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

export default function Admin() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    profile: 'user' as 'admin' | 'user',
    depositFee: '0',
    withdrawalFee: '0'
  });
  const [loading, setLoading] = useState(false);
  const [resettingMetrics, setResettingMetrics] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with settings data
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      console.log('Fetching users with settings...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          settings (
            deposit_fee,
            withdrawal_fee
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      console.log('Raw data from Supabase:', data);

      // Transform the data to match our interface
      const transformedData = data.map(user => {
        const settings = Array.isArray(user.settings) && user.settings.length > 0 
          ? user.settings[0] 
          : null;
        
        console.log(`User ${user.name} settings:`, settings);
        
        return {
          ...user,
          settings
        };
      }) as UserWithSettings[];

      console.log('Transformed data:', transformedData);
      return transformedData;
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
      console.log('Calling admin-create-user Edge Function...');
      
      // Call the Edge Function to create user securely
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          profile: newUser.profile,
          depositFee: newUser.depositFee,
          withdrawalFee: newUser.withdrawalFee
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        toast({
          variant: "destructive",
          title: "Erro ao criar usuário",
          description: error.message || "Erro interno do servidor.",
        });
        return;
      }

      if (!data?.success) {
        toast({
          variant: "destructive",
          title: "Erro ao criar usuário",
          description: data?.error || "Erro desconhecido.",
        });
        return;
      }

      console.log('User created successfully via Edge Function');

      // Clear form and close dialog
      setNewUser({ 
        name: '', 
        email: '', 
        password: '', 
        profile: 'user',
        depositFee: '0',
        withdrawalFee: '0'
      });
      setIsCreateDialogOpen(false);
      
      // Refresh the users list
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

  const handleBalanceAdjustment = (user: User) => {
    setSelectedUser(user);
    setIsBalanceModalOpen(true);
  };

  const resetDailyMetrics = async () => {
    setResettingMetrics(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('reset-daily-metrics');

      if (error) {
        console.error('Error resetting metrics:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao resetar métricas diárias.",
        });
        return;
      }

      toast({
        title: "Métricas resetadas",
        description: "Todas as métricas diárias foram resetadas com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setResettingMetrics(false);
    }
  };

  const updateUserFee = async (userId: string, feeType: 'deposit_fee' | 'withdrawal_fee', newValue: number): Promise<boolean> => {
    try {
      console.log(`Updating ${feeType} for user ${userId} to ${newValue}%`);
      
      // Primeiro, verificar se o usuário tem configurações
      const { data: existingSettings, error: fetchError } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing settings:', fetchError);
        throw fetchError;
      }

      let updateResult;

      if (!existingSettings) {
        // Criar configurações se não existirem
        console.log('Creating new settings for user:', userId);
        updateResult = await supabase
          .from('settings')
          .insert({
            user_id: userId,
            deposit_fee: feeType === 'deposit_fee' ? newValue : 0,
            withdrawal_fee: feeType === 'withdrawal_fee' ? newValue : 0
          });
      } else {
        // Atualizar configurações existentes
        console.log('Updating existing settings for user:', userId);
        updateResult = await supabase
          .from('settings')
          .update({ [feeType]: newValue })
          .eq('user_id', userId);
      }

      const { error } = updateResult;

      if (error) {
        console.error('Error updating fee:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: `Erro ao atualizar taxa de ${feeType === 'deposit_fee' ? 'depósito' : 'saque'}.`,
        });
        return false;
      }

      console.log('Fee updated successfully');

      // Refresh the users list
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      
      toast({
        title: "Taxa atualizada",
        description: `Taxa de ${feeType === 'deposit_fee' ? 'depósito' : 'saque'} atualizada para ${newValue}%.`,
      });
      
      return true;
    } catch (error) {
      console.error('Error in updateUserFee:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
      return false;
    }
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
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={resetDailyMetrics}
              disabled={resettingMetrics}
              className="bg-orange-50 hover:bg-orange-100 border-orange-200"
            >
              {resettingMetrics ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Resetando...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Resetar Métricas
                </>
              )}
            </Button>
            
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
                    <TableHead>Taxa Depósito</TableHead>
                    <TableHead>Taxa Saque</TableHead>
                    <TableHead>Saldo Líquido</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const userSettings = user.settings;
                    const depositFee = userSettings?.deposit_fee ?? 0;
                    const withdrawalFee = userSettings?.withdrawal_fee ?? 0;
                    
                    return (
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
                        <TableCell>
                          <FeeEditInput
                            currentValue={depositFee}
                            onUpdate={(newValue) => updateUserFee(user.id, 'deposit_fee', newValue)}
                            feeType="depósito"
                          />
                        </TableCell>
                        <TableCell>
                          <FeeEditInput
                            currentValue={withdrawalFee}
                            onUpdate={(newValue) => updateUserFee(user.id, 'withdrawal_fee', newValue)}
                            feeType="saque"
                          />
                        </TableCell>
                        <TableCell>
                          <NetBalanceDisplay
                            userId={user.id}
                            grossBalance={user.balance}
                            depositCount={0}
                          />
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBalanceAdjustment(user)}
                              title="Ajustar saldo"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleUserStatus(user.id, user.active)}
                              title={user.active ? "Desativar usuário" : "Ativar usuário"}
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
                              title="Resetar senha"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <BalanceAdjustmentModal
          user={selectedUser}
          isOpen={isBalanceModalOpen}
          onClose={() => {
            setIsBalanceModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          }}
        />
      </div>
    </DashboardLayout>
  );
}
