
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Muat env var berdasarkan mode (development/production)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      // Polling sangat disarankan untuk kestabilan di Termux (filesystem watch)
      watch: {
        usePolling: true,
      }
    },
    // Pengaturan Define yang Aman
    define: {
      // Hanya definisikan kunci spesifik yang dibutuhkan oleh SDK
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Sediakan objek process.env minimal agar library tidak error
      'process.env': {
        API_KEY: env.API_KEY || '',
        NODE_ENV: JSON.stringify(mode)
      }
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
    }
  };
});
