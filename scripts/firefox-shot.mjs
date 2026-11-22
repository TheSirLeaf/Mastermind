// Captura de tela do editor no Firefox (o mesmo motor do Firefox do dia a dia), para conferir
// bugs visuais que não aparecem no Chromium.
//
//   npm run shot:firefox -- [url] [saida.png] [largura] [altura] [espera-ms]
//
// Padrões: http://127.0.0.1:5173/ · firefox-shot.png · 1440 × 900 · 1500 ms.
// O servidor de desenvolvimento precisa estar rodando (`npm run dev`).
import { firefox } from '@playwright/test';

const [
  url = 'http://127.0.0.1:5173/',
  out = 'firefox-shot.png',
  w = '1440',
  h = '900',
  wait = '1500',
] = process.argv.slice(2);

const browser = await firefox.launch();
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  page.on('pageerror', (error) => console.error('[erro na página]', error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[console]', msg.text());
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(Number(wait));
  await page.screenshot({ path: out });
  console.log(`Firefox ${browser.version()} → ${out}`);
} finally {
  await browser.close();
}
