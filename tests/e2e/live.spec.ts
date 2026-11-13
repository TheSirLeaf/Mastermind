import { expect, test, type Page } from '@playwright/test';

// O Playwright sobe o Vite (5173) e o Worker das salas (8787); o Vite repassa /api para o Worker.

const importUi = `import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => /stores\\/uiStore/.test(n)) ?? '/src/stores/uiStore.ts')`;

async function openPresenter(
  page: Page,
  options: { spectatorView?: boolean; qr?: boolean } = {}
): Promise<string> {
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.addInitScript(() => {
    (window as unknown as { __imp: (p: string) => Promise<unknown> }).__imp = (p: string) =>
      import(p);
  });
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.evaluate(
    async ({ ui, opts }) => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
      const uiMod = await eval(ui);
      uiMod.useUIStore.getState().closeWelcome(false);
      const deckStore = await imp('/src/store/deckStore.ts');
      const deckMod = await imp('/src/packages/core/deck.ts');
      const deck = deckMod.createDefaultDeck();
      deck.settings = { live: true, spectatorView: opts.spectatorView === true };
      const regMod = await imp('/src/packages/core/PackageRegistry.ts');
      const qrSpec = {
        text: '',
        roomLink: true,
        size: 300,
        fg: '#000000',
        bg: '#FFFFFF',
        margin: 2,
        ecc: 'M',
        showText: true,
      };
      const qrHtml = opts.qr
        ? `<div class="pk-wrap" data-pkg="qr" data-spec='${JSON.stringify(qrSpec)}'>${regMod.registry.toHTML('qr', qrSpec)}</div>`
        : '';
      deck.slides = [
        {
          id: 'a',
          html:
            '<section class="slide dark" data-notes="Nota do slide 1" data-chat="1"><h2 class="title">Um</h2>' +
            qrHtml +
            '</section>',
        },
        {
          id: 'b',
          html: '<section class="slide dark" data-notes=""><h2 class="title">Dois</h2></section>',
        },
      ];
      deck.bases = [];
      deckStore.useDeckStore.getState().setDeck(deck);
      uiMod.useUIStore.getState().setWorkspace('presentation');
    },
    { ui: importUi, opts: options }
  );
  const code = page.getByTestId('room-code');
  await expect(code).toHaveText(/^[A-Z2-9]{5}$/, { timeout: 15000 });
  return (await code.textContent()) ?? '';
}

test('Ao vivo: espectador entra, conversa nos slides com chat e a tela exibida acompanha', async ({
  browser,
  baseURL,
}) => {
  const presenterCtx = await browser.newContext({
    baseURL: baseURL ?? 'http://127.0.0.1:5173',
    viewport: { width: 1500, height: 900 },
  });
  const presenter = await presenterCtx.newPage();
  const code = await openPresenter(presenter);

  // espectador no celular
  const phoneCtx = await browser.newContext({
    baseURL: baseURL ?? 'http://127.0.0.1:5173',
    viewport: { width: 390, height: 780 },
  });
  const phone = await phoneCtx.newPage();
  await phone.goto(`/join/${code}`);
  await expect(phone.getByLabel('Código da apresentação')).toHaveValue(code);
  await phone.getByLabel('Seu nome').fill('Ana');
  await phone.getByRole('button', { name: 'Entrar' }).click();
  await expect(phone.getByText('Ao vivo')).toBeVisible({ timeout: 10000 });
  await expect(presenter.getByTestId('spectators')).toHaveText('1');

  // slide 1 tem chat: o espectador consegue escrever
  const input = phone.getByLabel('Mensagem');
  await expect(input).toBeEnabled({ timeout: 10000 });
  await input.fill('Olá do celular!');
  await phone.getByRole('button', { name: 'Enviar' }).click();
  await expect(presenter.getByTestId('presenter-chat')).toContainText('Olá do celular!');

  // tela exibida (outra janela do mesmo navegador do apresentador)
  const [screen] = await Promise.all([
    presenterCtx.waitForEvent('page'),
    presenter.getByRole('button', { name: /Abrir tela de exibição/ }).click(),
  ]);
  await screen.waitForLoadState();
  await expect(screen.getByTestId('screen-chat')).toContainText('Olá do celular!', {
    timeout: 10000,
  });

  // ir para o slide 2 (sem chat): o chat do celular fecha
  await presenter.getByRole('button', { name: /Próximo/ }).click();
  await expect(phone.getByLabel('Mensagem')).toBeDisabled({ timeout: 10000 });
  await expect(screen.getByTestId('screen-chat')).toHaveCount(0);

  // apresentador reabre o chat manualmente
  await presenter.getByLabel('Chat aberto').check();
  await expect(phone.getByLabel('Mensagem')).toBeEnabled({ timeout: 10000 });
});

test('Ao vivo: QR da sala, slide no celular e encerramento fecha tudo', async ({
  browser,
  baseURL,
}) => {
  const presenterCtx = await browser.newContext({
    baseURL: baseURL ?? 'http://127.0.0.1:5173',
    viewport: { width: 1500, height: 900 },
  });
  const presenter = await presenterCtx.newPage();
  const code = await openPresenter(presenter, { spectatorView: true, qr: true });

  // o QR do slide mostra o link da sala (e não o exemplo)
  const main = presenter.frameLocator('iframe[title="Slide atual"]');
  await expect(main.locator('.pk-qr-text')).toHaveText(new RegExp(`/join/${code}$`), {
    timeout: 10000,
  });

  const phoneCtx = await browser.newContext({
    baseURL: baseURL ?? 'http://127.0.0.1:5173',
    viewport: { width: 390, height: 780 },
  });
  const phone = await phoneCtx.newPage();
  await phone.goto(`/join/${code}`);
  await phone.getByLabel('Seu nome').fill('Bia');
  await phone.getByRole('button', { name: 'Entrar' }).click();

  // o espectador vê o slide que está na tela (com o QR real), mas não consegue controlá-lo
  const viewer = phone.getByTestId('slide-viewer');
  await expect(viewer).toBeVisible({ timeout: 20000 });
  await phone.waitForTimeout(4000);
  const view = phone.frameLocator('iframe[title="Slide atual"]');
  await expect(view.locator('.slide.active h2')).toHaveText('Um', { timeout: 15000 });
  await view
    .locator('body')
    .click({ force: true, position: { x: 300, y: 100 } })
    .catch(() => undefined);
  await expect(view.locator('.slide.active h2')).toHaveText('Um');

  // o apresentador avança: o celular acompanha
  await presenter.getByRole('button', { name: /Próximo/ }).click();
  await expect(view.locator('.slide.active h2')).toHaveText('Dois', { timeout: 10000 });
  // as notas do apresentador não vão para o celular
  const html = await phone.evaluate(
    () => (document.querySelector('iframe[title="Slide atual"]') as HTMLIFrameElement).srcdoc
  );
  expect(html).not.toContain('Nota do slide 1');

  // encerrar a apresentação fecha o chat e a visão do slide no celular
  await presenter.getByLabel('Chat aberto').check();
  await expect(phone.getByLabel('Mensagem')).toBeEnabled({ timeout: 10000 });
  await presenter.getByRole('button', { name: /Encerrar/ }).click();
  await expect(phone.getByLabel('Mensagem')).toBeDisabled({ timeout: 10000 });
  await expect(phone.getByTestId('slide-viewer')).toHaveCount(0, { timeout: 10000 });
  await expect(phone.getByText('Aguardando o apresentador')).toBeVisible();
});
