
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserSettings {
  id: string;
  user_id: string;
  deposit_fee: number;
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
      
      // Enhanced security: Validate user ID and add explicit user check
      if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid user ID format');
      }
      
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user settings:', error);
        return;
      }

      // Additional validation to ensure settings belong to the correct user
      if (data && data.user_id === userId) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFee = async (feeType: 'deposit_fee', newValue: number) => {
    if (!userId || !settings) return false;

    try {
      // Enhanced validation for fee values
      if (newValue < 0 || newValue > 100) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Taxa deve estar entre 0% e 100%.",
        });
        return false;
      }

      const { error } = await supabase
        .from('settings')
        .update({ [feeType]: newValue })
        .eq('user_id', userId)
        .eq('id', settings.id); // Additional security check

      if (error) {
        console.error('Error updating fee:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao atualizar taxa.",
        });
        return false;
      }

      // Update local state only after successful database update
      setSettings(prev => prev ? { ...prev, [feeType]: newValue } : null);
      
      toast({
        title: "Taxa atualizada",
        description: `Taxa de depósito atualizada para ${newValue}%.`,
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
