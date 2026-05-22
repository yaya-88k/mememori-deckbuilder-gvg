import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    proxy: {
      '/tamamo-api': {
        target: 'https://tamamo.dev',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tamamo-api/, ''),
      },
    },
  },
});
