import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: true, // Listen on all local IPs
    proxy: {
      '/uploads': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      }
    }
  },
});
