
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RankingUser } from "@/hooks/useRanking";

interface UserNicknameEditorProps {
  currentUserRanking: RankingUser | null;
  updateApelido: (newApelido: string) => Promise<boolean>;
}

export function UserNicknameEditor({ currentUserRanking, updateApelido }: UserNicknameEditorProps) {
  const [newApelido, setNewApelido] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleApelidoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newApelido.trim()) {
      const success = await updateApelido(newApelido.trim());
      if (success) {
        setNewApelido("");
        setIsEditing(false);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">Seu Apelido no Ranking</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        {!isEditing ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 min-w-0">
              <span className="text-sm text-muted-foreground">Apelido atual:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm md:text-base break-all">
                  {currentUserRanking?.apelido || "Não definido"}
                </span>
                {currentUserRanking?.is_current_user && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">você</Badge>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="self-start md:self-auto flex-shrink-0"
            >
              Editar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleApelidoSubmit} className="flex flex-col gap-2 md:flex-row">
            <Input
              value={newApelido}
              onChange={(e) => setNewApelido(e.target.value)}
              placeholder="Digite seu apelido (máx. 10 caracteres)"
              maxLength={10}
              pattern="[A-Za-z0-9]+"
              className="flex-1 text-sm"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1 md:flex-none">
                Salvar
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => {
                  setIsEditing(false);
                  setNewApelido("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Apenas letras e números, máximo 10 caracteres
        </p>
      </CardContent>
    </Card>
  );
}
