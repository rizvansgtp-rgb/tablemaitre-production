import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = 
  Boolean(supabaseUrl) && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseAnonKey !== 'placeholder';

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing or default. App will run in limited demo mode.');
}

// Only attempt to create the client with real biological credentials if configured.
// Using a pseudo-valid URL structure for the placeholder to avoid some immediate parse errors,
// but the 'isSupabaseConfigured' check should be used by consumers to avoid making network calls.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://abcdefghijklmnopqrst.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder'
);
