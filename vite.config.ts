
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Muat env var agar bisa diakses di define jika diperlukan
  // FIX: Cast process to any to resolve "Property 'cwd' does not exist on type 'Process'" error.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      // Penting untuk Termux agar stabil
      watch: {
        usePolling: true,
      }
    },
    // Shim process.env untuk compatibility dengan SDK yang meminta process.env.API_KEY
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env': env
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
    }
  };
});
