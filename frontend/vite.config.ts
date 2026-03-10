import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Add this block:
  optimizeDeps: {
    include: ['agora-rtc-react', 'agora-rtc-sdk-ng', 'react-apexcharts', 'apexcharts'],
  },
  server: {
    host: true, 
    watch: {
      usePolling: true, 
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
});