import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

// Brilho que passa, sombras com animação de entrada, contorno e casos de borda dos keyframes.
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

function savedHtml(page: Page): Promise<string> {
  return page.evaluate(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
    const m = await imp('/src/store/deckStore.ts');
    return m.useDeckStore.getState().deck.slides[0]!.html as string;
  });
}

/** Clica no elemento #id dentro do palco do editor. */
async function clickStage(page: Page, selector: string): Promise<void> {
  const pos = await page.evaluate((sel) => {
    const f = [...document.querySelectorAll('iframe')].find(
      (x) => x.title === 'Palco da apresentação'
    ) as HTMLIFrameElement;
    const r = (f.contentDocument!.querySelector(sel) as HTMLElement).getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    return { x: fr.left + r.left + Math.min(20, r.width / 2), y: fr.top + r.top + r.height / 2 };
  }, selector);
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(400);
}

function stage<T>(page: Page, code: string): Promise<T> {
  return page.evaluate((src) => {
    const f = [...document.querySelectorAll('iframe')].find(
      (x) => x.title === 'Palco da apresentação'
    ) as HTMLIFrameElement;
    return new (f.contentWindow as unknown as { Function: FunctionConstructor }).Function(
      'document',
      'window',
      src
    )(f.contentDocument, f.contentWindow);
  }, code) as Promise<T>;
}

/** Conta pixels de uma área que satisfazem a condição (para "ver" o que foi pintado). */
async function countPixels(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
  match: (r: number, g: number, b: number) => boolean
): Promise<number> {
  const png = await page.screenshot({ clip });
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (match(data[i]!, data[i + 1]!, data[i + 2]!)) n += 1;
  }
  return n;
}

const TEXT = (extra: string, cls = '', attrs = '') =>
  `<section class="slide dark" data-notes=""><p id="k" class="ed-obj ed-text ${cls}" ${attrs} data-name="T" style="position:absolute;left:200px;top:300px;width:1400px;margin:0;font:700 120px Arial,sans-serif;color:#FF0000;${extra}">BRILHO</p></section>`;

const SHINE = (angle: number, width = 40) => {
  const rad = (angle * Math.PI) / 180;
  const sg = (v: number) => (Math.abs(v) < 0.02 ? 0 : Math.sign(v));
  const dx = sg(Math.sin(rad));
  const dy = sg(-Math.cos(rad));
  return `--mm-shine-c:#FFFFFF;--mm-shine-t:2s;--mm-shine-w:${width / 6}%;--mm-shine-a:${angle}deg;--mm-shine-d:0s;--mm-shine-p0:${50 + 50 * dx}% ${50 + 50 * dy}%;--mm-shine-p1:${50 - 50 * dx}% ${50 - 50 * dy}%`;
};

const isWhite = (r: number, g: number, b: number) => r > 235 && g > 200 && b > 200;
const isRed = (r: number, g: number, b: number) => r > 200 && g < 60 && b < 60;

for (const angle of [0, 90, 110, 180, 270]) {
  test(`Brilho que passa (${angle}°): atravessa o texto e some por completo entre as passadas`, async ({
    page,
  }) => {
    // caixa do tamanho do texto: a luz cruza o texto no meio da passada
    await boot(page, [TEXT(`width:max-content;${SHINE(angle)}`, 'mm-shine')]);
    const pres = await presentation(page);
    const box = await pres.evaluate(() => {
      const r = (document.querySelector('.slide.active #k') as HTMLElement).getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    });
    const at = async (fraction: number) => {
      await pres.evaluate((f) => {
        const el = document.querySelector('.slide.active #k') as HTMLElement;
        const anim = el.getAnimations().find((a) => a.id === 'mm-shine')!;
        anim.pause();
        anim.currentTime = 2000 * f;
      }, fraction);
      await pres.waitForTimeout(60);
      return {
        white: await countPixels(pres, box, isWhite),
        red: await countPixels(pres, box, isRed),
      };
    };
    // parado (antes de começar e na espera): só a cor do texto, nenhuma faixa de luz visível
    const start = await at(0);
    expect(start.red).toBeGreaterThan(500);
    expect(start.white).toBe(0);
    const rest = await at(0.8);
    expect(rest.white).toBe(0);
    expect(rest.red).toBe(start.red);
    // no meio da passada: a luz está sobre o texto
    const mid = await at(0.3);
    expect(mid.white).toBeGreaterThan(100);
    // e ela anda: um pouco depois, a luz está em outro lugar
    const a = await at(0.25);
    const b = await at(0.35);
    expect(a.white + b.white).toBeGreaterThan(0);
  });
}

test('Brilho convive com a animação de entrada (a entrada roda uma vez só)', async ({ page }) => {
  await boot(page, [TEXT(SHINE(110), 'mm-shine anim', 'data-anim="rise"')]);
  const pres = await presentation(page);
  const info = await pres.evaluate(() => {
    const el = document.querySelector('.slide.active #k') as HTMLElement;
    return el.getAnimations().map((a) => ({
      id: a.id,
      name: (a as CSSAnimation).animationName ?? '',
      iterations: a.effect?.getTiming().iterations,
    }));
  });
  const entrance = info.find((a) => a.name);
  const shine = info.find((a) => a.id === 'mm-shine');
  // um trecho com cor própria dentro da caixa com brilho mantém a cor dele
  const spanFill = await pres.evaluate(() => {
    const el = document.querySelector('.slide.active #k') as HTMLElement;
    const span = document.createElement('span');
    span.setAttribute('style', 'color:#00FF00');
    span.textContent = '!';
    el.appendChild(span);
    return getComputedStyle(span).webkitTextFillColor;
  });
  expect(spanFill).toBe('rgb(0, 255, 0)');
  expect(entrance?.iterations).toBe(1);
  expect(shine?.iterations).toBe(Infinity);
  await pres.waitForTimeout(1500);
  const opacity = await pres.evaluate(
    () => getComputedStyle(document.querySelector('.slide.active #k') as Element).opacity
  );
  expect(opacity).toBe('1');
});

test('Brilho: liga na aba Animação, aparece na timeline e pode ser arrastado', async ({ page }) => {
  await boot(page, [TEXT('')]);
  await page.evaluate(async (importUi) => {
    const ui = await eval(importUi);
    ui.useUIStore.getState().setWorkspace('animation');
  }, IMPORT_UI);
  await page.waitForTimeout(1200);
  await clickStage(page, '#k');
  await page.getByRole('button', { name: 'Brilho', exact: true }).click();
  await page.getByLabel('Brilho que passa', { exact: true }).check();
  await page.waitForTimeout(500);
  let html = await savedHtml(page);
  expect(html).toMatch(/class="[^"]*mm-shine/);
  expect(html).toContain('data-shine=');
  expect(html).toContain('--mm-shine-p0');

  const row = page.getByTestId('timeline-shine');
  await expect(row).toBeVisible();
  const bar = row.getByRole('button', { name: /Brilho de/ });
  const bb = (await bar.boundingBox())!;
  // arrasta a barra: muda quando o brilho começa
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2, { steps: 4 });
  await page.mouse.move(bb.x + bb.width / 2 + 120, bb.y + bb.height / 2, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  html = await savedHtml(page);
  const delay = Number(/--mm-shine-d:\s*([\d.]+)s/.exec(html)?.[1]);
  expect(delay).toBeGreaterThan(0.2);

  // ângulo 0° pelo painel: as posições passam a andar na vertical
  await page.getByLabel('Ângulo').fill('0');
  await page.waitForTimeout(400);
  html = await savedHtml(page);
  expect(html).toMatch(/--mm-shine-p0:\s*50% 0%/);

  // desligar limpa tudo
  await page.getByLabel('Brilho que passa', { exact: true }).uncheck();
  await page.waitForTimeout(400);
  html = await savedHtml(page);
  expect(html).not.toContain('mm-shine');
  expect(html).not.toContain('data-shine');
  await expect(row).toHaveCount(0);
});

const GRAD_SHADOW =
  '-webkit-text-fill-color:transparent;background-image:linear-gradient(90deg,#F7D98B,#C77C8A);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0px 0px 12px rgb(247, 217, 139))';

test('Sombra de texto com gradiente continua com animação de entrada (editor e apresentação)', async ({
  page,
}) => {
  await boot(page, [
    TEXT(GRAD_SHADOW, 'anim', 'data-anim="blur"'),
    TEXT('text-shadow:0 0 12px #F7D98B', 'anim', 'data-anim="rise"').replace('id="k"', 'id="k2"'),
  ]);
  // editor (modo parado): o filtro da sombra continua valendo
  const editorFilter = await stage<string>(
    page,
    "return window.getComputedStyle(document.querySelector('#k')).filter"
  );
  expect(editorFilter).toContain('drop-shadow');

  const pres = await presentation(page);
  await pres.waitForTimeout(1600);
  const end = await pres.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.slide.active #k') as Element);
    return { filter: cs.filter, opacity: cs.opacity };
  });
  // depois da entrada "Desfoque": opaco e com a sombra de volta
  expect(end.opacity).toBe('1');
  expect(end.filter).toContain('drop-shadow');

  await pres.keyboard.press('ArrowRight');
  await pres.waitForTimeout(1600);
  const shadow = await pres.evaluate(
    () => getComputedStyle(document.querySelector('.slide.active #k2') as Element).textShadow
  );
  expect(shadow).toContain('12px');
});

test('Keyframe que leva o texto para fora do slide: visível na pose, cortado fora dela', async ({
  page,
}) => {
  const kf = '[{"t":1,"x":-900,"y":0,"s":1,"r":0,"o":1,"ease":"linear"}]';
  await boot(page, [TEXT('', '', `data-kf='${kf}'`)]);
  await page.evaluate(async (importUi) => {
    const ui = await eval(importUi);
    ui.useUIStore.getState().setWorkspace('animation');
  }, IMPORT_UI);
  await page.waitForTimeout(1200);
  await clickStage(page, '#k');
  const overflow = () =>
    stage<string>(
      page,
      "return window.getComputedStyle(document.querySelector('.slide.active')).overflow"
    );
  expect(await overflow()).toBe('hidden');
  await page.getByRole('button', { name: /Keyframe 1 de/ }).click();
  await page.waitForTimeout(600);
  // na pose, o texto está à esquerda do slide e mesmo assim aparece
  expect(await overflow()).toBe('visible');
  const left = await stage<number>(
    page,
    "var r=document.querySelector('#k').getBoundingClientRect();var s=document.querySelector('.slide.active').getBoundingClientRect();return r.left-s.left"
  );
  expect(left).toBeLessThan(0);
  // saindo da aba Animação a pose acaba e o slide volta a cortar o que vaza
  await page.evaluate(async (importUi) => {
    const ui = await eval(importUi);
    ui.useUIStore.getState().setWorkspace('editor');
  }, IMPORT_UI);
  await page.waitForTimeout(600);
  expect(await overflow()).toBe('hidden');
});

test('Keyframes de texto: único em t=0 vale como estado final; brilho mantém a sombra do texto', async ({
  page,
}) => {
  await boot(page, [
    `<section class="slide dark" data-notes=""><h2 id="a" style="position:absolute;left:100px;top:100px;font-size:60px;color:#FFFFFF" data-kf='[{"t":0,"x":0,"y":0,"s":1,"r":0,"o":1,"fs":120,"ease":"linear"}]'>Um</h2><h2 id="b" style="position:absolute;left:100px;top:400px;font-size:60px;color:#FFFFFF;text-shadow:5px 5px 0px rgb(0, 0, 255)" data-kf='[{"t":1,"x":0,"y":0,"s":1,"r":0,"o":1,"g":20,"gc":"#00FF00","ease":"linear"}]'>Dois</h2></section>`,
  ]);
  const pres = await presentation(page);
  await pres.waitForTimeout(1500);
  const end = await pres.evaluate(() => ({
    a: getComputedStyle(document.querySelector('.slide.active #a') as Element).fontSize,
    b: getComputedStyle(document.querySelector('.slide.active #b') as Element).textShadow,
  }));
  expect(end.a).toBe('120px');
  // o brilho verde entrou e a sombra azul original continua lá
  expect(end.b).toContain('rgb(0, 255, 0)');
  expect(end.b).toContain('rgb(0, 0, 255) 5px 5px 0px');
});

test('Texto com keyframes que chega por Interpolar parte do próprio estilo, não do slide anterior', async ({
  page,
}) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p data-name="T" style="position:absolute;left:100px;top:100px;margin:0;font-size:40px;color:#FFFFFF">Texto</p></section>',
    `<section class="slide dark" data-transition="morph" data-notes=""><p data-name="T" style="position:absolute;left:600px;top:400px;margin:0;font-size:100px;color:#FFFFFF" data-kf='[{"t":2,"x":0,"y":0,"s":1,"r":0,"o":1,"fs":160,"ease":"linear"}]'>Texto</p></section>`,
  ]);
  const pres = await presentation(page);
  await pres.keyboard.press('ArrowRight');
  await pres.waitForTimeout(200);
  const sizes = await pres.evaluate(() => {
    const p = document.querySelector('.slide.active [data-name=T]') as HTMLElement;
    const anims = p.getAnimations();
    const kf = anims.find((a) => a.id === 'mm-kf')!;
    // a transição continua em curso (ler o estilo natural não a interrompeu)
    const morph = anims.filter((a) => a !== kf);
    const running = morph.map((a) => `${a.playState}:${Math.round(Number(a.currentTime))}`);
    const midSize = getComputedStyle(p).fontSize;
    // termina a transição e olha o keyframe no instante 0 e no fim
    anims.filter((a) => a !== kf).forEach((a) => a.finish());
    kf.pause();
    // os keyframes esperam a transição (800 ms) e só então começam
    const delay = Number(kf.effect?.getTiming().delay ?? 0);
    kf.currentTime = delay;
    const start = getComputedStyle(p).fontSize;
    kf.currentTime = delay + 2000;
    const end = getComputedStyle(p).fontSize;
    return {
      start,
      end,
      running,
      midSize,
      delay,
      visible: getComputedStyle(p).visibility,
      opacity: getComputedStyle(p).opacity,
    };
  });
  expect(sizes.running.length).toBeGreaterThanOrEqual(2);
  for (const state of sizes.running) {
    const [play, time] = state.split(':');
    expect(play).toBe('running');
    expect(Number(time)).toBeGreaterThan(50);
    expect(Number(time)).toBeLessThan(700);
  }
  // no meio do caminho entre 40px (slide anterior) e 100px
  expect(parseFloat(sizes.midSize)).toBeGreaterThan(40);
  expect(parseFloat(sizes.midSize)).toBeLessThan(100);
  expect(sizes.delay).toBeGreaterThan(400);
  expect(sizes.delay).toBeLessThanOrEqual(800);
  expect(sizes.start).toBe('100px');
  expect(sizes.end).toBe('160px');
  expect(sizes.visible).toBe('visible');
  expect(sizes.opacity).toBe('1');
});

test('Contorno: por fora e no meio são visivelmente diferentes (cor sólida e gradiente)', async ({
  page,
}) => {
  const base =
    'position:absolute;left:100px;margin:0;font:700 160px Arial,sans-serif;color:#FFFFFF';
  const G =
    '-webkit-text-fill-color:transparent;background-image:linear-gradient(90deg,#FFFFFF,#FFFFFF);-webkit-background-clip:text;background-clip:text';
  const RED = '#FF0000';
  // os mesmos estilos que o painel gera (8px): por fora / no meio, sólido e com gradiente
  await boot(page, [
    `<section class="slide dark" data-notes="" style="background:#000">
      <p id="so" style="${base};top:40px;-webkit-text-stroke:16px ${RED};paint-order:stroke fill">OO</p>
      <p id="sm" style="${base};top:240px;-webkit-text-stroke:8px ${RED}">OO</p>
      <p id="go" style="${base};top:440px;${G};filter:drop-shadow(8px 0 0 ${RED}) drop-shadow(-8px 0 0 ${RED}) drop-shadow(0 8px 0 ${RED}) drop-shadow(0 -8px 0 ${RED})">OO</p>
      <p id="gm" style="${base};top:640px;${G};-webkit-text-stroke:8px ${RED}">OO</p>
    </section>`,
  ]);
  const pres = await presentation(page);
  const count = async (id: string) => {
    const box = await pres.evaluate((sel) => {
      const r = (
        document.querySelector(`.slide.active #${sel}`) as HTMLElement
      ).getBoundingClientRect();
      return { x: r.left - 12, y: r.top - 4, width: r.width + 24, height: r.height + 8 };
    }, id);
    return {
      white: await countPixels(pres, box, (r, g, b) => r > 230 && g > 230 && b > 230),
      red: await countPixels(pres, box, isRed),
    };
  };
  const so = await count('so');
  const sm = await count('sm');
  const go = await count('go');
  const gm = await count('gm');
  // por fora: a letra fica inteira (mais branco) do que com o traço no meio comendo a borda
  expect(so.white).toBeGreaterThan(sm.white * 1.15);
  expect(go.white).toBeGreaterThan(gm.white * 1.15);
  // e os dois têm contorno
  for (const c of [so, sm, go, gm]) expect(c.red).toBeGreaterThan(300);
  // por fora, sólido e gradiente ficam parecidos entre si
  expect(Math.abs(so.white - go.white) / so.white).toBeLessThan(0.15);
});
