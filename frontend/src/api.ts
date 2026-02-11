import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase Client
// Ensure these variables are in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Create Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// 3. Update Interceptor to use Supabase Session
api.interceptors.request.use(
  async (config) => {
    // Get the session from Supabase SDK (more reliable than manual localStorage)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
