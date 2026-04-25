import axios from 'axios';
import { supabase } from './supabaseClient';

//  Check if we are running locally or on Vercel
const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// Create Axios instance - don't use baseURL since we're using Vite proxy
// 2. Set the baseURL dynamically
// Locally: http://127.0.0.1:8000/api
// Vercel: /_backend/api (as defined in your vercel.json)
const api = axios.create({
  baseURL: isLocal ? 'http://127.0.0.1:8000/api' : '/_backend/api',
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
