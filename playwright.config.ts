import { defineConfig, devices } from '@playwright/test';

// Portas configuráveis (úteis quando 5173/8787 já estão em uso na sua máquina).
const PORT = Number(process.env.E2E_PORT ?? 5173);
const WORKER_PORT = Number(process.env.E2E_WORKER_PORT ?? 8787);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `npm run dev -- --port ${PORT} --strictPort`,
      url: `http://127.0.0.1:${PORT}`,
      env: { LIVE_WORKER_PORT: String(WORKER_PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Worker das salas ao vivo (o Vite repassa /api para ele). Precisa da pasta `dist`.
      command: `node -e "require('fs').mkdirSync('dist',{recursive:true})" && npx wrangler dev --port ${WORKER_PORT}`,
      url: `http://127.0.0.1:${WORKER_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { WRANGLER_SEND_METRICS: 'false' },
    },
  ],
});
