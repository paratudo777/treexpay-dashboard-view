
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FeeEditInput } from './FeeEditInput';
import {
  Eye,
  DollarSign,
  UserX,
  UserCheck,
  RotateCcw,
  Trash2,
  Mail,
  Calendar,
  Shield,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

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

interface UserCardProps {
  user: User & { settings: UserSettings | null };
  onViewDetails: () => void;
  onAdjustBalance: () => void;
  onToggleStatus: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  onUpdateFee: (feeType: 'deposit_fee' | 'withdrawal_fee', value: number) => Promise<boolean>;
}

export const UserCard = ({
  user,
  onViewDetails,
  onAdjustBalance,
  onToggleStatus,
  onResetPassword,
  onDelete,
  onUpdateFee,
}: UserCardProps) => {
  const depositFee = user.settings?.deposit_fee ?? 0;
  const withdrawalFee = user.settings?.withdrawal_fee ?? 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <Card className="glass-card border-border/40 hover:border-primary/20 transition-all duration-200 group">
      <CardContent className="p-5">
        {/* Top row: Name + badges + actions */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-foreground truncate">{user.name}</h3>
              {user.profile === 'admin' ? (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0 shrink-0">
                  <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                  Admin
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  <Shield className="h-2.5 w-2.5 mr-0.5" />
                  Usuário
                </Badge>
              )}
              <Badge
                className={`text-[10px] px-1.5 py-0 shrink-0 ${
                  user.active
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/15 text-red-400 border-red-500/20'
                }`}
              >
                {user.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={onViewDetails} title="Detalhes">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-500/10 hover:text-emerald-400" onClick={onAdjustBalance} title="Ajustar saldo">
              <DollarSign className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-amber-500/10 hover:text-amber-400" onClick={onToggleStatus} title={user.active ? 'Desativar' : 'Ativar'}>
              {user.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-blue-500/10 hover:text-blue-400" onClick={onResetPassword} title="Resetar senha">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-500/10 hover:text-red-400" onClick={onDelete} title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Bottom row: fees + balance + date */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/30">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Taxa Depósito</p>
            <FeeEditInput currentValue={depositFee} onUpdate={(v) => onUpdateFee('deposit_fee', v)} feeType="deposit_fee" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Taxa Saque</p>
            <FeeEditInput currentValue={withdrawalFee} onUpdate={(v) => onUpdateFee('withdrawal_fee', v)} feeType="withdrawal_fee" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Saldo</p>
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">{formatCurrency(user.balance)}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Criado em</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
