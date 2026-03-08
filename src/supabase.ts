
import { createClient } from '@supabase/supabase-js';

// Vite exposes runtime-safe env vars via import.meta.env in client apps.
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://gkkknbnvobkwiashsrlk.supabase.co';
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tZgfI4lfHqzqlXaDdH047A_cjrirvQc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
