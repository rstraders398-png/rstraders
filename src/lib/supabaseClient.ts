import { createClient } from '@supabase/supabase-js';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const procEnv = typeof process !== 'undefined' ? process.env : undefined;

const supabaseUrl: string =
  metaEnv?.VITE_SUPABASE_URL ||
  procEnv?.VITE_SUPABASE_URL ||
  procEnv?.NEXT_PUBLIC_SUPABASE_URL ||
  procEnv?.SUPABASE_URL ||
  'https://dummy-placeholder.supabase.co';

const supabaseAnonKey: string =
  metaEnv?.VITE_SUPABASE_ANON_KEY ||
  procEnv?.VITE_SUPABASE_ANON_KEY ||
  procEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  procEnv?.SUPABASE_ANON_KEY ||
  'dummy-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
