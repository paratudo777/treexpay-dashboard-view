import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AcquirerOption {
  id: string;
  name: string;
  label: string;
  available: boolean;
}

export const AVAILABLE_ACQUIRERS: AcquirerOption[] = [
  { id: 'novaera', name: 'novaera', label: 'NovaEra', available: true },
  { id: 'bestfy', name: 'bestfy', label: 'Bestfy', available: false },
];

export interface UserAcquirerRow {
  user_id: string;
  provider: string;
  user_name?: string;
  user_email?: string;
}

export function useAcquirerConfig() {
  const [globalProvider, setGlobalProvider] = useState<string>('novaera');
  const [userConfigs, setUserConfigs] = useState<UserAcquirerRow[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [gcRes, ucRes, usersRes] = await Promise.all([
        supabase.from('acquirer_config').select('*').limit(1).single(),
        supabase.from('user_acquirer_config').select('*'),
        supabase.from('profiles').select('id, name, email').order('name'),
      ]);

      if (gcRes.data) setGlobalProvider((gcRes.data as any).default_provider);
      if (ucRes.data) setUserConfigs((ucRes.data as any[]).map(r => ({ user_id: r.user_id, provider: r.provider })));
      if (usersRes.data) setUsers(usersRes.data);
    } catch (err) {
      console.error('Error fetching acquirer config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateGlobalProvider = useCallback(async (provider: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('acquirer_config')
        .update({ default_provider: provider, updated_at: new Date().toISOString() } as any)
        .not('id', 'is', null);

      if (error) throw error;
      setGlobalProvider(provider);
      toast({ title: 'Adquirente global atualizada', description: `Agora usando ${provider}` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const setUserProvider = useCallback(async (userId: string, provider: string | null) => {
    setSaving(true);
    try {
      if (!provider) {
        const { error } = await supabase
          .from('user_acquirer_config')
          .delete()
          .eq('user_id', userId);
        if (error) throw error;
        setUserConfigs(prev => prev.filter(c => c.user_id !== userId));
        toast({ title: 'Configuração removida', description: 'Usuário usará a adquirente global' });
      } else {
        const { error } = await supabase
          .from('user_acquirer_config')
          .upsert({ user_id: userId, provider, updated_at: new Date().toISOString() } as any, { onConflict: 'user_id' });
        if (error) throw error;
        setUserConfigs(prev => {
          const existing = prev.find(c => c.user_id === userId);
          if (existing) return prev.map(c => c.user_id === userId ? { ...c, provider } : c);
          return [...prev, { user_id: userId, provider }];
        });
        toast({ title: 'Adquirente do usuário atualizada', description: `Agora usando ${provider}` });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  return {
    globalProvider,
    userConfigs,
    users,
    loading,
    saving,
    updateGlobalProvider,
    setUserProvider,
    refetch: fetchAll,
  };
}
