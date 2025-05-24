
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhwfonispezljglrclia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod2ZvbmlzcGV6bGpnbHJjbGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjMzNTYsImV4cCI6MjA1OTEzOTM1Nn0.tLXi1DUINNeKyLEA0lDKF8vGiTR8AXxliKOZRVmtW6s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
