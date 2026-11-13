import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/packages/core', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@packages': fileURLToPath(new URL('./src/packages', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@store': fileURLToPath(new URL('./src/store', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    // Salas ao vivo: em desenvolvimento, o Worker roda à parte (`npm run dev:worker`).
    proxy: {
      '/api': { target: `http://127.0.0.1:${process.env.LIVE_WORKER_PORT ?? 8787}`, ws: true },
    },
  },
});
