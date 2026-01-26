
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Muat env var berdasarkan mode (development/production)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      host: true, // Membuka akses network
      port: 5173,
      allowedHosts: true, // Izinkan semua host untuk tunneling/termux
      // Polling sangat disarankan untuk kestabilan di Termux (filesystem watch)
      watch: {
        usePolling: true,
        interval: 1000,
      }
    },
    // Pengaturan Define yang Aman
    define: {
      // Definisi process.env untuk kompatibilitas SDK Google GenAI
      'process.env': {
        API_KEY: env.API_KEY || '',
        NODE_ENV: JSON.stringify(mode),
        ...env
      }
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
    }
  };
});
