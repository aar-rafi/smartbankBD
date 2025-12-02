import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// IBBL Bank Instance - Port 5000
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  return {
    server: {
      port: 5000,
      host: 'localhost',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_BANK_CODE': JSON.stringify('ibbl'),
      'import.meta.env.VITE_BANK_NAME': JSON.stringify('Islami Bank Bangladesh Limited'),
      'import.meta.env.VITE_APP_MODE': JSON.stringify('bank'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    appType: 'spa'
  };
});

