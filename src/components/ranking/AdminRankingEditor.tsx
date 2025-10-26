import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RankingUser } from "@/hooks/useRanking";
import { Shield, Save } from "lucide-react";

interface AdminRankingEditorProps {
  ranking: RankingUser[];
  refetch: () => Promise<void>;
}

export function AdminRankingEditor({ ranking, refetch }: AdminRankingEditorProps) {
  const [editedUsers, setEditedUsers] = useState<Map<string, { apelido: string; volume: string }>>(new Map());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleApelidoChange = (userId: string, value: string) => {
    const current = editedUsers.get(userId) || { apelido: "", volume: "" };
    setEditedUsers(new Map(editedUsers.set(userId, { ...current, apelido: value })));
  };

  const handleVolumeChange = (userId: string, value: string) => {
    // Permitir vírgula e ponto como separador decimal
    const normalizedValue = value.replace(',', '.');
    const current = editedUsers.get(userId) || { apelido: "", volume: "" };
    setEditedUsers(new Map(editedUsers.set(userId, { ...current, volume: normalizedValue })));
  };

  const saveChanges = async (userId: string, user: RankingUser) => {
    const changes = editedUsers.get(userId);
    if (!changes || (!changes.apelido && !changes.volume)) {
      toast({
        variant: "destructive",
        title: "Nada para salvar",
        description: "Faça alterações antes de salvar.",
      });
      return;
    }

    setSaving(new Set(saving).add(userId));

    try {
      // Preparar dados para upsert
      const upsertData: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };

      // Validar e adicionar apelido
      if (changes.apelido) {
        if (changes.apelido.length > 10 || !/^[A-Za-z0-9]+$/.test(changes.apelido)) {
          throw new Error("Apelido inválido: use apenas letras e números, máximo 10 caracteres");
        }
        upsertData.apelido = changes.apelido;
      } else {
        // Manter o apelido atual se não foi editado
        upsertData.apelido = user.apelido;
      }

      // Validar e adicionar volume
      if (changes.volume) {
        const volumeNum = parseFloat(changes.volume);
        if (isNaN(volumeNum) || volumeNum < 0) {
          throw new Error("Volume inválido: digite um número válido");
        }
        upsertData.volume_total_mensal = volumeNum;
      } else {
        // Manter o volume atual se não foi editado
        upsertData.volume_total_mensal = user.volume_total_mensal;
      }

      // Usar upsert para criar ou atualizar o registro
      const { error } = await supabase
        .from('ranking')
        .upsert(upsertData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Erro ao salvar no ranking:', error);
        throw error;
      }

      console.log('✅ Salvo com sucesso no ranking:', { userId, changes });

      toast({
        title: "✅ Salvo com sucesso!",
        description: `Alterações aplicadas para ${changes.apelido || user.apelido}`,
      });

      // Limpar edições deste usuário
      const newEdited = new Map(editedUsers);
      newEdited.delete(userId);
      setEditedUsers(newEdited);

      // Forçar atualização do ranking
      console.log('🔄 Atualizando ranking após salvar...');
      await refetch();

    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
      });
    } finally {
      const newSaving = new Set(saving);
      newSaving.delete(userId);
      setSaving(newSaving);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const top10 = ranking.slice(0, 10);

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <Shield className="h-5 w-5" />
          Painel Admin - Edição Ranking Top 10
        </CardTitle>
        <CardDescription>
          Edite nomes e volumes dos 10 primeiros colocados. Mudanças aparecem em tempo real para todos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Pos</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Volume Mensal</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top10.map((user) => {
                const edited = editedUsers.get(user.user_id);
                const isSaving = saving.has(user.user_id);
                const hasChanges = edited && (edited.apelido || edited.volume);

                return (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-bold">{user.position}º</TableCell>
                    <TableCell>
                      <Input
                        value={edited?.apelido ?? user.apelido}
                        onChange={(e) => handleApelidoChange(user.user_id, e.target.value)}
                        placeholder="Novo apelido"
                        className="max-w-[150px]"
                        maxLength={10}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={edited?.volume ?? user.volume_total_mensal}
                        onChange={(e) => handleVolumeChange(user.user_id, e.target.value)}
                        placeholder="Ex: 1500,50"
                        className="max-w-[150px]"
                      />
                      <span className="text-xs text-muted-foreground ml-2">
                        Atual: {formatCurrency(user.volume_total_mensal)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => saveChanges(user.user_id, user)}
                        disabled={!hasChanges || isSaving}
                        className="gap-2"
                      >
                        <Save className="h-3 w-3" />
                        {isSaving ? "Salvando..." : "Salvar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
