
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit } from 'lucide-react';

interface FeeEditInputProps {
  currentValue: number;
  onUpdate: (newValue: number) => Promise<boolean>;
  feeType: string;
}

export const FeeEditInput = ({ currentValue, onUpdate, feeType }: FeeEditInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(currentValue.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    const numValue = parseFloat(tempValue);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return;
    }

    setIsUpdating(true);
    const success = await onUpdate(numValue);
    setIsUpdating(false);
    
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempValue(currentValue.toString());
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{currentValue}%</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-6 w-6 p-0"
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
        max="100"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        className="w-16 h-6 text-xs"
        autoFocus
      />
      <span className="text-xs">%</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSave}
        disabled={isUpdating}
        className="h-6 w-6 p-0"
      >
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        className="h-6 w-6 p-0"
      >
        <X className="h-3 w-3 text-red-600" />
      </Button>
    </div>
  );
};
