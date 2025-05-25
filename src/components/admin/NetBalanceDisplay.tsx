
import { useNetBalance } from '@/hooks/useNetBalance';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface NetBalanceDisplayProps {
  userId: string;
  grossBalance: number;
  depositCount?: number;
}

export const NetBalanceDisplay = ({ userId, grossBalance, depositCount = 0 }: NetBalanceDisplayProps) => {
  const { netBalance, totalFees, depositFeePercentage, providerFee } = useNetBalance(userId, grossBalance, depositCount);

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col">
        <span className="font-medium">R$ {netBalance.toFixed(2)}</span>
        {totalFees > 0 && (
          <span className="text-xs text-muted-foreground">
            Bruto: R$ {grossBalance.toFixed(2)}
          </span>
        )}
      </div>
      
      {totalFees > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p><strong>Saldo Bruto:</strong> R$ {grossBalance.toFixed(2)}</p>
                <p><strong>Taxa Personalizada ({depositFeePercentage}%):</strong> -R$ {((grossBalance * depositFeePercentage) / 100).toFixed(2)}</p>
                <p><strong>Taxa Provedor ({depositCount}x R$ 1,50):</strong> -R$ {providerFee.toFixed(2)}</p>
                <hr className="my-1" />
                <p><strong>Saldo Líquido:</strong> R$ {netBalance.toFixed(2)}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
