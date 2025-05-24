
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createAdminUser, CreateAdminUserRequest } from '@/utils/createAdminUser';
import { UserPlus, Shield } from 'lucide-react';

export function CreateAdminButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateAdminUserRequest>({
    email: 'manomassa717@gmail.com',
    password: '1@2s3D',
    name: 'Administrador'
  });
  const { toast } = useToast();

  const handleCreateAdmin = async () => {
    setIsLoading(true);
    
    try {
      console.log('Creating admin user with data:', { email: formData.email, name: formData.name });
      
      const result = await createAdminUser(formData);
      
      if (result.success) {
        toast({
          title: "Administrador criado com sucesso!",
          description: `Usuário ${result.email} foi criado com privilégios de administrador.`,
        });
        
        console.log('Admin user created successfully:', result);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao criar administrador",
          description: result.details || result.error || "Erro desconhecido",
        });
        
        console.error('Failed to create admin user:', result);
      }
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado ao criar o administrador.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-treexpay-medium" />
          Criar Administrador
        </CardTitle>
        <CardDescription>
          Configure o usuário administrador inicial da plataforma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-input"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="bg-input"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-input"
          />
        </div>
        
        <Button 
          onClick={handleCreateAdmin}
          disabled={isLoading || !formData.email || !formData.password || !formData.name}
          className="w-full bg-treexpay-dark hover:bg-treexpay-medium"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {isLoading ? 'Criando...' : 'Criar Administrador'}
        </Button>
      </CardContent>
    </Card>
  );
}
