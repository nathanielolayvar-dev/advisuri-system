import axios from 'axios';
import { ACCESS_TOKEN } from './constants';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // imports anything specified in environment file
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; //how to pass JWT access token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

//now uses this object to send different requests
export default api;
