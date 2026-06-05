import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safety check to ensure variables are loading
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase environment variables are missing! Check your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // 👈 ADD THIS: Explicitly forces local storage tokens
    autoRefreshToken: true,
    detectSessionInUrl: true, // 👈 ADD THIS: Ensures it actively listens for hash/query tokens
  },
});
