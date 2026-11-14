import { expect, test, type Page } from '@playwright/test';

// Interpolação de formatação de texto: keyframes (dentro do slide) e transição "Interpolar".
const IMPORT_UI = `import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => /stores\\/uiStore/.test(n)) ?? '/src/stores/uiStore.ts')`;

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

/** Abre a apresentação gerada (a mesma do arquivo exportado) numa nova página. */
async function presentation(page: Page): Promise<Page> {
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
  await pres.waitForTimeout(400);
  return pres;
}

const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const near = (a: number[], b: number[], tol = 4) =>
  a.length === b.length && a.every((v, i) => Math.abs(v - b[i]!) <= tol);

test('Keyframes de texto: cor, tamanho, peso, brilho e desfoque passam de um ao outro', async ({
  page,
}) => {
  const kf =
    '[{"t":1,"c":"#FF0000","fs":120,"w":700,"g":20,"gc":"#00FF00","bl":4,"ease":"linear"}]';
  await boot(page, [
    `<section class="slide dark" data-notes=""><h2 id="k" style="position:absolute;left:100px;top:100px;font-size:60px;color:#FFFFFF;font-weight:400" data-kf='${kf}'>Titulo</h2></section>`,
  ]);
  const pres = await presentation(page);

  // controla o relógio da animação para medir em pontos exatos
  const at = (ms: number) =>
    pres.evaluate((t) => {
      const el = document.querySelector('.slide.active #k') as HTMLElement;
      const anim = el.getAnimations().find((a) => a.id === 'mm-kf')!;
      anim.pause();
      anim.currentTime = t;
      const cs = getComputedStyle(el);
      return {
        fs: parseFloat(cs.fontSize),
        color: cs.color,
        w: Number(cs.fontWeight),
        shadow: cs.textShadow,
        filter: cs.filter,
      };
    }, ms);

  const start = await at(0);
  expect(start.fs).toBeCloseTo(60, 0);
  expect(rgb(start.color)).toEqual([255, 255, 255]);

  const mid = await at(500);
  expect(mid.fs).toBeGreaterThan(85);
  expect(mid.fs).toBeLessThan(95);
  expect(near(rgb(mid.color), [255, 128, 128], 6)).toBe(true);
  expect(mid.w).toBeGreaterThan(500);
  expect(mid.w).toBeLessThan(600);
  expect(mid.filter).toBe('blur(2px)');
  expect(mid.shadow).toContain('0, 255, 0');

  const end = await at(1000);
  expect(end.fs).toBeCloseTo(120, 0);
  expect(rgb(end.color)).toEqual([255, 0, 0]);
  expect(end.w).toBe(700);
  expect(end.filter).toBe('blur(4px)');
});

test('Keyframe de texto: editado na aba Animação e mostrado no palco sem sujar o slide', async ({
  page,
}) => {
  await boot(page, [
    `<section class="slide dark" data-notes=""><h2 id="k" data-name="T" style="position:absolute;left:100px;top:100px;font-size:60px;color:#FFFFFF" data-kf='[{"t":1,"x":0,"y":0,"s":1,"r":0,"o":1,"ease":"linear"}]'>Titulo</h2></section>`,
  ]);
  await page.evaluate(async (importUi) => {
    const ui = await eval(importUi);
    ui.useUIStore.getState().setWorkspace('animation');
  }, IMPORT_UI);
  await page.waitForTimeout(1200);
  // seleciona o título no palco
  const pos = await page.evaluate(() => {
    const f = [...document.querySelectorAll('iframe')].find(
      (x) => x.title === 'Palco da apresentação'
    ) as HTMLIFrameElement;
    const r = (f.contentDocument!.querySelector('#k') as HTMLElement).getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    return { x: fr.left + r.left + r.width / 2, y: fr.top + r.top + r.height / 2 };
  });
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(500);
  await page
    .getByRole('button', { name: /Interpolação/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Texto do keyframe 1' }).click();
  await page.getByLabel('Tamanho (px)').fill('120');
  await page.getByLabel('Tamanho (px)').press('Enter');
  await page.getByLabel('Peso').selectOption('700');
  await page.waitForTimeout(400);

  const kf = await page.evaluate(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
    const m = await imp('/src/store/deckStore.ts');
    const html = m.useDeckStore.getState().deck.slides[0]!.html as string;
    const h2 = new DOMParser().parseFromString(html, 'text/html').querySelector('h2')!;
    return JSON.parse(h2.getAttribute('data-kf')!) as Array<Record<string, unknown>>;
  });
  expect(kf[0]).toMatchObject({ fs: 120, w: 700 });

  // mostrar o keyframe no palco aplica a formatação; o HTML guardado continua natural
  await page.getByRole('button', { name: /Keyframe 1 de/ }).click();
  await page.waitForTimeout(600);
  const posed = await page.evaluate(() => {
    const f = [...document.querySelectorAll('iframe')].find(
      (x) => x.title === 'Palco da apresentação'
    ) as HTMLIFrameElement;
    const el = f.contentDocument!.querySelector('#k') as HTMLElement;
    return { fs: el.style.fontSize, w: el.style.fontWeight };
  });
  expect(posed).toEqual({ fs: '120px', w: '700' });
  const saved = await page.evaluate(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
    const m = await imp('/src/store/deckStore.ts');
    return m.useDeckStore.getState().deck.slides[0]!.html as string;
  });
  expect(saved).toContain('font-size:60px');
  expect(saved).not.toContain('font-size: 120px');
});

test('Transição Interpolar: o texto muda de tamanho, cor e peso suavemente (sem esticar)', async ({
  page,
}) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p data-name="T" style="position:absolute;left:100px;top:100px;width:600px;margin:0;font-size:40px;font-weight:400;color:#FFFFFF">Olá <span style="color:#FF0000">mundo</span></p></section>',
    '<section class="slide dark" data-transition="morph" data-notes=""><p data-name="T" style="position:absolute;left:900px;top:500px;width:900px;margin:0;font-size:100px;font-weight:700;color:#0000FF;letter-spacing:0.1em">Olá <span style="color:#00FF00">mundo</span></p></section>',
  ]);
  const pres = await presentation(page);
  await pres.keyboard.press('ArrowRight');

  const at = (ms: number | 'end') =>
    pres.evaluate((t) => {
      const p = document.querySelector('.slide.active [data-name=T]') as HTMLElement;
      const span = p.querySelector('span') as HTMLElement;
      const anims = [...p.getAnimations(), ...span.getAnimations()];
      anims.forEach((a) => {
        a.pause();
        if (t === 'end') a.finish();
        else a.currentTime = t;
      });
      const cs = getComputedStyle(p);
      const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
      return {
        count: anims.length,
        fs: parseFloat(cs.fontSize),
        color: cs.color,
        w: Number(cs.fontWeight),
        width: parseFloat(cs.width),
        spanColor: getComputedStyle(span).color,
        scaleX: m.a,
        scaleY: m.d,
        tx: m.e,
      };
    }, ms);

  const mid = await at(400);
  expect(mid.count).toBeGreaterThanOrEqual(3);
  // metade do caminho (curva simétrica): 40px → 100px, branco → azul, vermelho → verde
  expect(mid.fs).toBeGreaterThan(64);
  expect(mid.fs).toBeLessThan(76);
  expect(near(rgb(mid.color), [128, 128, 255], 12)).toBe(true);
  expect(near(rgb(mid.spanColor), [128, 128, 0], 12)).toBe(true);
  expect(mid.w).toBeGreaterThan(500);
  expect(mid.w).toBeLessThan(600);
  expect(mid.width).toBeGreaterThan(700);
  expect(mid.width).toBeLessThan(800);
  // o texto não é esticado: só se desloca
  expect(mid.scaleX).toBe(1);
  expect(mid.scaleY).toBe(1);
  expect(mid.tx).toBeLessThan(0);

  const end = await at('end');
  expect(end.fs).toBeCloseTo(100, 0);
  expect(rgb(end.color)).toEqual([0, 0, 255]);
  expect(rgb(end.spanColor)).toEqual([0, 255, 0]);
  expect(end.w).toBe(700);
  expect(end.tx).toBe(0);
});

test('Transição Interpolar: textos com estruturas diferentes ainda interpolam a caixa', async ({
  page,
}) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p data-name="T" style="position:absolute;left:100px;top:100px;margin:0;font-size:40px;color:#FFFFFF">Antes</p></section>',
    '<section class="slide dark" data-transition="morph" data-notes=""><p data-name="T" style="position:absolute;left:100px;top:100px;margin:0;font-size:80px;color:#FFFFFF">Depois <b>com</b> <i>trechos</i></p></section>',
  ]);
  const pres = await presentation(page);
  await pres.keyboard.press('ArrowRight');
  const fs = await pres.evaluate(() => {
    const p = document.querySelector('.slide.active [data-name=T]') as HTMLElement;
    p.getAnimations().forEach((a) => {
      a.pause();
      a.currentTime = 400;
    });
    return parseFloat(getComputedStyle(p).fontSize);
  });
  expect(fs).toBeGreaterThan(50);
  expect(fs).toBeLessThan(70);
});
