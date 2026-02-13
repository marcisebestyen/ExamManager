import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'https://localhost:7195',
        changeOrigin: true,
        secure: false
      }
    },
    port: 7285,
    open: true,
    host: 'localhost'
  },
});