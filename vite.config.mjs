import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // En desarrollo, /api se reenvía a la API PHP (`npm run dev:api`). Se usa 127.0.0.1 y no
  // "localhost" porque Node puede resolverlo a IPv6 y no encontrar el servidor de PHP.
  const env = loadEnv(mode, 'frontend', '');
  return {
    plugins: [react()],
    root: 'frontend',
    build: { outDir: 'dist', emptyOutDir: true },
    server: {
      port: 5173,
      proxy: { '/api': env.VITE_API_PROXY || 'http://127.0.0.1:8080' },
    },
  };
});
