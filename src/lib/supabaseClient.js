import { createClient } from '@supabase/supabase-js';
import { config } from './supabaseConfig';

let clientInstance = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return clientInstance;
}

export const supabase = getSupabaseClient();
