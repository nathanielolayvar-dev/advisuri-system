import axios from 'axios';
import { supabase } from './supabaseClient';

// Create Axios instance - don't use baseURL since we're using Vite proxy
const api = axios.create({
  baseURL: '', // Will use relative URLs which go through Vite proxy
});

// Update Interceptor to use Supabase Session
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
