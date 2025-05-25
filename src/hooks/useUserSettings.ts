
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserSettings {
  id: string;
  user_id: string;
  deposit_fee: number;
  withdrawal_fee: number;
}

export const useUserSettings = (userId?: string) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user settings:', error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFee = async (feeType: 'deposit_fee' | 'withdrawal_fee', newValue: number) => {
    if (!userId || !settings) return false;

    try {
      const { error } = await supabase
        .from('settings')
        .update({ [feeType]: newValue })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating fee:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao atualizar taxa.",
        });
        return false;
      }

      // Atualizar estado local
      setSettings(prev => prev ? { ...prev, [feeType]: newValue } : null);
      
      toast({
        title: "Taxa atualizada",
        description: `Taxa de ${feeType === 'deposit_fee' ? 'depósito' : 'saque'} atualizada para ${newValue}%.`,
      });
      
      return true;
    } catch (error) {
      console.error('Error in updateFee:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  return {
    settings,
    loading,
    updateFee,
    refetch: fetchSettings
  };
};
