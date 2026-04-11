
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil, Loader2 } from 'lucide-react';

interface FeeEditInputProps {
  currentValue: number;
  onUpdate: (newValue: number) => Promise<boolean>;
  feeType: 'deposit_fee' | 'withdrawal_fee';
}

export const FeeEditInput = ({ currentValue, onUpdate, feeType }: FeeEditInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(currentValue.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempValue(currentValue.toString());
  }, [currentValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const numValue = parseFloat(tempValue);

    if (feeType === 'deposit_fee' && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
      setTempValue(currentValue.toString());
      setIsEditing(false);
      return;
    }

    if (feeType === 'withdrawal_fee' && (isNaN(numValue) || numValue < 0)) {
      setTempValue(currentValue.toString());
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const success = await onUpdate(numValue);
      if (success) {
        setIsEditing(false);
      } else {
        setTempValue(currentValue.toString());
      }
    } catch {
      setTempValue(currentValue.toString());
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setTempValue(currentValue.toString());
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => { setTempValue(currentValue.toString()); setIsEditing(true); }}
        className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border/60 hover:bg-muted/50 transition-all duration-150 cursor-pointer"
      >
        <span className="text-sm font-semibold text-foreground">
          {feeType === 'deposit_fee'
            ? `${currentValue.toFixed(2)}% + R$ 1,50`
            : `R$ ${currentValue.toFixed(2)}`
          }
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder={feeType === 'deposit_fee' ? '8.99' : '5.00'}
          className="w-20 h-8 text-xs pr-7 bg-muted/30"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            else if (e.key === 'Escape') handleCancel();
          }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
          {feeType === 'deposit_fee' ? '%' : 'R$'}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSave}
        disabled={isUpdating}
        className="h-7 w-7 hover:bg-emerald-500/10"
      >
        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-emerald-500" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        disabled={isUpdating}
        className="h-7 w-7 hover:bg-red-500/10"
      >
        <X className="h-3 w-3 text-red-500" />
      </Button>
    </div>
  );
};
