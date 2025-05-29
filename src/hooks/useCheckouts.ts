
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Checkout {
  id: string;
  title: string;
  amount: number;
  url_slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckoutData {
  title: string;
  amount: number;
}

export const useCheckouts = () => {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCheckouts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('checkouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching checkouts:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar checkouts.",
        });
        return;
      }

      setCheckouts(data || []);
    } catch (error) {
      console.error('Error in fetchCheckouts:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro interno. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (checkoutData: CreateCheckoutData): Promise<boolean> => {
    if (!user) return false;

    try {
      // Gerar slug único
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_checkout_slug');

      if (slugError) {
        throw new Error('Failed to generate checkout slug');
      }

      const { error } = await supabase
        .from('checkouts')
        .insert({
          user_id: user.id,
          title: checkoutData.title,
          amount: checkoutData.amount,
          url_slug: slugData
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Checkout criado",
        description: "Checkout criado com sucesso!",
      });

      await fetchCheckouts();
      return true;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar checkout.",
      });
      return false;
    }
  };

  const updateCheckout = async (id: string, updates: Partial<CreateCheckoutData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('checkouts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Checkout atualizado",
        description: "Checkout atualizado com sucesso!",
      });

      await fetchCheckouts();
      return true;
    } catch (error) {
      console.error('Error updating checkout:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar checkout.",
      });
      return false;
    }
  };

  const toggleCheckoutStatus = async (id: string, active: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('checkouts')
        .update({ active })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      toast({
        title: active ? "Checkout ativado" : "Checkout desativado",
        description: `Checkout ${active ? 'ativado' : 'desativado'} com sucesso!`,
      });

      await fetchCheckouts();
      return true;
    } catch (error) {
      console.error('Error toggling checkout status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao alterar status do checkout.",
      });
      return false;
    }
  };

  const deleteCheckout = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('checkouts')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Checkout deletado",
        description: "Checkout deletado com sucesso!",
      });

      await fetchCheckouts();
      return true;
    } catch (error) {
      console.error('Error deleting checkout:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao deletar checkout.",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCheckouts();
  }, [user]);

  return {
    checkouts,
    loading,
    createCheckout,
    updateCheckout,
    toggleCheckoutStatus,
    deleteCheckout,
    refetch: fetchCheckouts
  };
};
