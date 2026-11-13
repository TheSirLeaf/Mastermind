import { expect, test, type Page } from '@playwright/test';

// O Vite pode servir um módulo com `?t=` (depois de HMR): importa pela URL que o app realmente usou,
// para falar com a MESMA instância do store.
const IMPORT_UI = `import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => /stores\\/uiStore/.test(n)) ?? '/src/stores/uiStore.ts')`;

const KF =
  '[{"t":1,"x":300,"y":100,"s":1.5,"r":45,"o":0.5,"ease":"linear"},{"t":2,"x":0,"y":0,"s":1,"r":0,"o":1,"ease":"linear"}]';

async function boot(page: Page, slides: string[]): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __imp: (p: string) => Promise<unknown> }).__imp = (p: string) =>
      import(p);
  });
  await page.goto('/');
  await page.waitForTimeout(2500);
  await page.evaluate(
    async ({ slides: html, importUi }) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
      const ui = await eval(importUi);
      const deckStore = await imp('/src/store/deckStore.ts');
      const deckMod = await imp('/src/packages/core/deck.ts');
      const deck = deckMod.createDefaultDeck();
      deck.slides = html.map((h: string, i: number) => ({ id: `s${i}`, html: h }));
      deck.bases = [];
      deckStore.useDeckStore.getState().setDeck(deck);
      ui.useUIStore.getState().closeWelcome(false);
      ui.useUIStore.getState().closeNewSlide();
    },
    { slides, importUi: IMPORT_UI }
  );
  await page.waitForTimeout(1500);
}

test('Interpolar: o elemento com o mesmo nome vai do lugar antigo ao novo (não ao contrário)', async ({
  page,
}) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><div data-name="Caixa" style="position:absolute;left:200px;top:500px;width:300px;height:200px;background:#c33"></div></section>',
    '<section class="slide light" data-transition="morph" data-notes=""><div data-name="Caixa" style="position:absolute;left:1200px;top:100px;width:600px;height:400px;background:#3c3"></div></section>',
  ]);

  const html = await page.evaluate(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
    const exp = await imp('/src/packages/core/export.ts');
    const reg = await imp('/src/packages/core/PackageRegistry.ts');
    const deckStore = await imp('/src/store/deckStore.ts');
    return exp.buildPresentationHTML({
      template: await exp.loadTemplate(),
      deck: deckStore.useDeckStore.getState().deck,
      registry: reg.registry,
    });
  });

  const pres = await page.context().newPage();
  await pres.setViewportSize({ width: 1280, height: 720 });
  await pres.setContent(html, { waitUntil: 'load' });
  await pres.waitForTimeout(500);

  const boxes = () =>
    pres.evaluate(() => {
      const el = [
        ...document.querySelectorAll('.slide.active [data-name=Caixa]'),
      ][0] as HTMLElement;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), w: Math.round(r.width) };
    });

  const start = await boxes();
  await pres.keyboard.press('ArrowRight');
  await pres.waitForTimeout(150);
  const early = await boxes();
  await pres.waitForTimeout(900);
  const end = await boxes();

  // começa perto do lugar antigo (pequeno, à esquerda) e termina no novo (grande, à direita)
  expect(start.x).toBeLessThan(200);
  expect(early.x).toBeLessThan(400);
  expect(early.w).toBeLessThan(300);
  expect(end.x).toBeGreaterThan(700);
  expect(end.w).toBeGreaterThan(380);
});

test('Interpolação no slide: percorre os keyframes e termina no estado final', async ({ page }) => {
  await boot(page, [
    `<section class="slide dark" data-notes=""><h2 class="title" data-kf='${KF}'>Titulo</h2></section>`,
  ]);
  const html = await page.evaluate(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
    const exp = await imp('/src/packages/core/export.ts');
    const reg = await imp('/src/packages/core/PackageRegistry.ts');
    const deckStore = await imp('/src/store/deckStore.ts');
    return exp.buildPresentationHTML({
      template: await exp.loadTemplate(),
      deck: deckStore.useDeckStore.getState().deck,
      registry: reg.registry,
    });
  });
  const pres = await page.context().newPage();
  await pres.setContent(html, { waitUntil: 'load' });
  await pres.waitForTimeout(1000);
  const mid = await pres.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.slide.active h2') as Element);
    return { translate: cs.translate, scale: Number(cs.scale), opacity: Number(cs.opacity) };
  });
  expect(mid.translate).not.toBe('none');
  expect(mid.scale).toBeGreaterThan(1.3);
  expect(mid.opacity).toBeLessThan(0.7);
  await pres.waitForTimeout(1800);
  const end = await pres.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.slide.active h2') as Element);
    return { scale: Number(cs.scale), opacity: Number(cs.opacity) };
  });
  expect(end).toEqual({ scale: 1, opacity: 1 });
});

test('Clicar no keyframe da timeline mostra o elemento na pose e permite editar sem sujar o slide', async ({
  page,
}) => {
  await boot(page, [
    `<section class="slide dark" data-notes=""><h2 class="title" data-name="T" style="width:600px" data-kf='${KF}'>Titulo</h2></section>`,
  ]);
  await page.evaluate(async (importUi) => {
    const ui = await eval(importUi);
    ui.useUIStore.getState().setWorkspace('animation');
  }, IMPORT_UI);
  await page.waitForTimeout(1500);

  const pose = () =>
    page.evaluate(() => {
      const f = [...document.querySelectorAll('iframe')].find(
        (x) => x.title === 'Palco da apresentação'
      ) as HTMLIFrameElement;
      const t = f.contentDocument!.querySelector('.slide.active h2') as HTMLElement;
      const r = t.getBoundingClientRect();
      const fr = f.getBoundingClientRect();
      return {
        translate: t.style.translate,
        rotate: t.style.rotate,
        cx: fr.left + r.left + r.width / 2,
        cy: fr.top + r.top + r.height / 2,
      };
    });

  expect((await pose()).translate).toBe('');
  await page.getByRole('button', { name: /Keyframe 1 de/ }).click();
  await page.waitForTimeout(1000);
  expect(await pose()).toMatchObject({ translate: '300px 100px', rotate: '45deg' });

  // edita o giro pelo inspetor: a pose acompanha
  await page
    .getByRole('button', { name: /Interpolação/ })
    .first()
    .click();
  await page.getByLabel('Giro (°)').first().fill('90');
  await page.getByLabel('Giro (°)').first().press('Enter');
  await page.waitForTimeout(800);
  expect((await pose()).rotate).toBe('90deg');

  // arrasta o elemento no palco: o keyframe guarda a nova posição
  const p0 = await pose();
  await page.mouse.move(p0.cx, p0.cy);
  await page.mouse.down();
  await page.mouse.move(p0.cx + 30, p0.cy + 15, { steps: 5 });
  await page.mouse.move(p0.cx + 60, p0.cy + 30, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(1000);

  const { saved, kfs } = await page.evaluate(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
    const m = await imp('/src/store/deckStore.ts');
    const html = m.useDeckStore.getState().deck.slides[0]!.html;
    const h2 = new DOMParser().parseFromString(html, 'text/html').querySelector('h2')!;
    return {
      saved: html,
      kfs: JSON.parse(h2.getAttribute('data-kf')!) as Array<{ x: number; y: number; r: number }>,
    };
  });
  expect(kfs[0]!.x).toBeGreaterThan(300);
  expect(kfs[0]!.y).toBeGreaterThan(100);
  expect(kfs[0]!.r).toBe(90);
  // o HTML guardado continua com o estado natural (sem a pose)
  expect(saved).not.toContain('translate');

  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.waitForTimeout(600);
  expect((await pose()).translate).toBe('');
});
