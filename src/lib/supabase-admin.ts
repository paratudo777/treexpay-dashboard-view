
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Cliente administrativo usando service role key
const supabaseUrl = 'https://fhwfonispezljglrclia.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod2ZvbmlzcGV6bGpnbHJjbGlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzU2MzM1NiwiZXhwIjoyMDU5MTM5MzU2fQ.mU-2_D6LLKKcEz7oJI5SyoE7L3ykOCHhkrNgLrTNIcg';

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
