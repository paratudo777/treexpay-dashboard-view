
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
import { Plus, UserCheck, UserX, RotateCcw } from 'lucide-react';
import { useAdminUsers, type CreateUserData } from '@/hooks/useAdminUsers';

export default function Admin() {
  const { users, isLoading, createUser, toggleUserStatus, resetPassword } = useAdminUsers();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    profile: 'user',
    depositFee: 0,
    withdrawalFee: 0
  });

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      return;
    }

    setIsCreating(true);
    const success = await createUser(newUser);
    
    if (success) {
      setNewUser({ 
        name: '', 
        email: '', 
        password: '', 
        profile: 'user',
        depositFee: 0,
        withdrawalFee: 0
      });
      setIsCreateDialogOpen(false);
    }
    setIsCreating(false);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    await toggleUserStatus(userId, currentStatus);
  };

  const handleResetPassword = async (userId: string) => {
    await resetPassword(userId);
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
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo usuário. Ele será criado como ativo e pronto para uso.
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
                    placeholder="Nome completo do usuário"
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
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Senha Temporária
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="col-span-3"
                    placeholder="Senha inicial do usuário"
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
                    Taxa de Depósito (%)
                  </Label>
                  <Input
                    id="depositFee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newUser.depositFee}
                    onChange={(e) => setNewUser({ ...newUser, depositFee: parseFloat(e.target.value) || 0 })}
                    className="col-span-3"
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="withdrawalFee" className="text-right">
                    Taxa de Saque (%)
                  </Label>
                  <Input
                    id="withdrawalFee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newUser.withdrawalFee}
                    onChange={(e) => setNewUser({ ...newUser, withdrawalFee: parseFloat(e.target.value) || 0 })}
                    className="col-span-3"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-4 text-sm text-muted-foreground bg-muted p-3 rounded">
                  <p><strong>Configurações:</strong></p>
                  <p>• O usuário será criado como <strong>ativo</strong></p>
                  <p>• Taxa de depósito: {newUser.depositFee}%</p>
                  <p>• Taxa de saque: {newUser.withdrawalFee}%</p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleCreateUser}
                  disabled={!newUser.name || !newUser.email || !newUser.password || isCreating}
                >
                  {isCreating ? 'Criando...' : 'Criar Usuário'}
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
              <div className="flex justify-center items-center py-8">
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
                    <TableHead>Criado em</TableHead>
                    <TableHead>Último Login</TableHead>
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
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        {user.lastLogin ? formatDate(user.lastLogin) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, user.active)}
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
                            onClick={() => handleResetPassword(user.id)}
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
