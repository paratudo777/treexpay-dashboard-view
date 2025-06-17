
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit } from 'lucide-react';

interface FeeEditInputProps {
  currentValue: number;
  onUpdate: (newValue: number) => Promise<boolean>;
  feeType: 'deposit_fee' | 'withdrawal_fee';
}

export const FeeEditInput = ({ currentValue, onUpdate, feeType }: FeeEditInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(currentValue.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  // Atualizar tempValue quando currentValue mudar
  useEffect(() => {
    setTempValue(currentValue.toString());
  }, [currentValue]);

  const handleSave = async () => {
    const numValue = parseFloat(tempValue);
    
    // Validação específica por tipo de taxa
    if (feeType === 'deposit_fee' && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
      // Taxa de depósito deve ser percentual entre 0 e 100
      setTempValue(currentValue.toString());
      setIsEditing(false);
      return;
    }
    
    if (feeType === 'withdrawal_fee' && (isNaN(numValue) || numValue < 0)) {
      // Taxa de saque deve ser valor positivo
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
        // Em caso de erro, resetar para o valor original
        setTempValue(currentValue.toString());
      }
    } catch (error) {
      console.error('Erro ao salvar taxa:', error);
      // Resetar para o valor original em caso de erro
      setTempValue(currentValue.toString());
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setTempValue(currentValue.toString());
    setIsEditing(false);
  };

  const handleEdit = () => {
    setTempValue(currentValue.toString());
    setIsEditing(true);
  };

  const getFeeTypeName = () => {
    return feeType === 'deposit_fee' ? 'depósito' : 'saque';
  };

  const formatFeeDisplay = () => {
    if (feeType === 'deposit_fee') {
      // Taxa de depósito: percentual + fixo
      return `${currentValue.toFixed(2)}% + R$ 1,50`;
    } else {
      // Taxa de saque: valor fixo
      return `R$ ${currentValue.toFixed(2)}`;
    }
  };

  const getInputPlaceholder = () => {
    if (feeType === 'deposit_fee') {
      return 'Ex: 8.99';
    } else {
      return 'Ex: 5.00';
    }
  };

  const getInputLabel = () => {
    if (feeType === 'deposit_fee') {
      return '%';
    } else {
      return 'R$';
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatFeeDisplay()}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="h-6 w-6 p-0 hover:bg-gray-100"
          title={`Editar taxa de ${getFeeTypeName()}`}
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        step="0.01"
        min="0"
        max={feeType === 'deposit_fee' ? "100" : undefined}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        placeholder={getInputPlaceholder()}
        className="w-20 h-8 text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
          } else if (e.key === 'Escape') {
            handleCancel();
          }
        }}
      />
      <span className="text-xs">{getInputLabel()}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={isUpdating}
        className="h-6 w-6 p-0 hover:bg-green-100"
        title="Salvar"
      >
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        disabled={isUpdating}
        className="h-6 w-6 p-0 hover:bg-red-100"
        title="Cancelar"
      >
        <X className="h-3 w-3 text-red-600" />
      </Button>
    </div>
  );
};
