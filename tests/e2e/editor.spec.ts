import { expect, test, type Page } from '@playwright/test';

// Recursos do editor 1.1: recorte no slide, guias, camadas, pai/filho, texto rico, menus.
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

/** Retângulo (em px da página) de um elemento dentro do palco, e a escala do slide. */
function box(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const f = [...document.querySelectorAll('iframe')].find(
      (x) => x.title === 'Palco da apresentação'
    ) as HTMLIFrameElement;
    const doc = f.contentDocument!;
    const el = doc.querySelector(sel) as HTMLElement | null;
    const slide = doc.querySelector('.slide.active') as HTMLElement;
    const fr = f.getBoundingClientRect();
    const sr = slide.getBoundingClientRect();
    const r = (el ?? slide).getBoundingClientRect();
    const s = sr.width / 1920;
    return {
      x: fr.left + r.left,
      y: fr.top + r.top,
      w: r.width,
      h: r.height,
      cx: fr.left + r.left + r.width / 2,
      cy: fr.top + r.top + r.height / 2,
      s,
      // posição dentro do slide, em px do slide
      sx: (r.left - sr.left) / s,
      sy: (r.top - sr.top) / s,
      sw: r.width / s,
    };
  }, selector);
}

function stageEval<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate((code) => {
    const f = [...document.querySelectorAll('iframe')].find(
      (x) => x.title === 'Palco da apresentação'
    ) as HTMLIFrameElement;
    return new (f.contentWindow as unknown as { Function: FunctionConstructor }).Function(
      'document',
      'window',
      code
    )(f.contentDocument, f.contentWindow);
  }, fn) as Promise<T>;
}

function savedHtml(page: Page): Promise<string> {
  return page.evaluate(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
    const m = await imp('/src/store/deckStore.ts');
    return m.useDeckStore.getState().deck.slides[0]!.html as string;
  });
}

async function has(page: Page, selector: string): Promise<boolean> {
  const html = await savedHtml(page);
  return page.evaluate(
    ({ h, sel }) => new DOMParser().parseFromString(h, 'text/html').querySelector(sel) !== null,
    { h: html, sel: selector }
  );
}

async function drag(page: Page, from: { cx: number; cy: number }, dx: number, dy: number) {
  await page.mouse.move(from.cx, from.cy);
  await page.mouse.down();
  await page.mouse.move(from.cx + dx / 3, from.cy + dy / 3, { steps: 4 });
  await page.mouse.move(from.cx + dx, from.cy + dy, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

const BOX = (id: string, style: string) =>
  `<div class="ed-obj ed-shape" id="${id}" data-name="${id}" style="position:absolute;${style};background:#c55"></div>`;

test('Partes fora do slide ficam cortadas e aparecem só como contorno no editor', async ({
  page,
}) => {
  await boot(page, [
    `<section class="slide dark" data-notes="">${BOX('fora', 'left:1700px;top:200px;width:600px;height:300px')}</section>`,
  ]);
  const overflow = await stageEval<string>(
    page,
    "return getComputedStyle(document.querySelector('.slide.active')).overflow"
  );
  expect(overflow).toBe('hidden');
  const ghosts = await stageEval<number>(
    page,
    "return document.querySelectorAll('#mm-ghosts .mm-ghost').length"
  );
  expect(ghosts).toBe(1);
});

test('Arrastar encaixa no centro do slide; com Ctrl não encaixa', async ({ page }) => {
  await boot(page, [
    `<section class="slide dark" data-notes="">${BOX('a', 'left:300px;top:300px;width:200px;height:200px')}</section>`,
  ]);
  const b0 = await box(page, '#a');
  // centro em 400 → 960 (+4 px de tela além do centro): fica dentro da distância de encaixe
  await drag(page, b0, 560 * b0.s + 4, 0);
  const snapped = await box(page, '#a');
  expect(Math.round(snapped.sx + snapped.sw / 2)).toBe(960);

  const b1 = await box(page, '#a');
  await page.keyboard.down('Control');
  await drag(page, b1, -4, 0);
  await drag(page, await box(page, '#a'), 8, 0);
  await page.keyboard.up('Control');
  const free = await box(page, '#a');
  expect(Math.abs(free.sx + free.sw / 2 - 960)).toBeGreaterThan(2);
});

test('Trazer para frente passa só por cima de quem o cobre', async ({ page }) => {
  await boot(page, [
    `<section class="slide dark" data-notes="">${BOX('a', 'left:100px;top:100px;width:300px;height:300px;z-index:1')}${BOX('longe', 'left:1200px;top:600px;width:200px;height:200px;z-index:2')}${BOX('b', 'left:250px;top:250px;width:300px;height:300px;z-index:3')}${BOX('c', 'left:1500px;top:100px;width:200px;height:200px;z-index:4')}</section>`,
  ]);
  const a = await box(page, '#a');
  await page.mouse.click(a.x + 20, a.y + 20);
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+BracketRight');
  await page.waitForTimeout(500);
  const z = await stageEval<Record<string, number>>(
    page,
    "var o={};['a','b','c','longe'].forEach(function(i){o[i]=+document.getElementById(i).style.zIndex});return o"
  );
  // "a" passa de "b" (que o cobria), mas não pula "c", que nem encosta nele
  expect(z.a).toBeGreaterThan(z.b!);
  expect(z.a).toBeLessThan(z.c!);
  await expect(page.getByText(/Camada \d de 4/)).toBeVisible();
});

test('Definir pai e soltar do pai mantêm o elemento no lugar', async ({ page }) => {
  await boot(page, [
    `<section class="slide dark" data-notes="">${BOX('pai', 'left:200px;top:200px;width:800px;height:500px')}${BOX('filho', 'left:1300px;top:300px;width:200px;height:200px')}</section>`,
  ]);
  const f0 = await box(page, '#filho');
  await page.mouse.click(f0.cx, f0.cy);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Pai', exact: true }).click();
  await page.getByRole('menuitem', { name: /Definir pai/ }).click();
  await expect(page.getByText(/Clique no elemento que vai ser o pai/)).toBeVisible();
  const p = await box(page, '#pai');
  await page.mouse.click(p.x + 30, p.y + 30);
  await page.waitForTimeout(600);

  expect(await has(page, '#pai > #filho')).toBe(true);
  const f1 = await box(page, '#filho');
  expect(Math.round(f1.sx)).toBe(Math.round(f0.sx));
  await expect(page.getByTestId('parent-row')).toContainText('Dentro de');

  // mover o pai leva o filho junto
  await drag(page, await box(page, '#pai'), -40, 0);
  const f2 = await box(page, '#filho');
  expect(f2.sx).toBeLessThan(f1.sx - 20);

  await page.mouse.click(f2.cx, f2.cy);
  await page.waitForTimeout(300);
  await page
    .getByTestId('parent-row')
    .getByRole('button', { name: /Soltar/ })
    .click();
  await page.waitForTimeout(600);
  expect(await has(page, '#pai > #filho')).toBe(false);
  expect(await has(page, 'section > #filho')).toBe(true);
  const f3 = await box(page, '#filho');
  expect(Math.round(f3.sx)).toBe(Math.round(f2.sx));
});

test('Dois cliques seleciona a palavra e o trecho pode ser formatado', async ({ page }) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p class="ed-obj ed-text" id="t" style="position:absolute;left:200px;top:200px;width:1200px;font-size:60px">Olá mundo bonito</p></section>',
  ]);
  const word = await stageEval<{ x: number; y: number; w: number; h: number }>(
    page,
    "var t=document.getElementById('t').firstChild;var r=document.createRange();r.setStart(t,4);r.setEnd(t,9);var b=r.getBoundingClientRect();return {x:b.left,y:b.top,w:b.width,h:b.height}"
  );
  const frame = await box(page, '.slide.active');
  const fr = await page.evaluate(() => {
    const f = [...document.querySelectorAll('iframe')].find(
      (x) => x.title === 'Palco da apresentação'
    ) as HTMLIFrameElement;
    const r = f.getBoundingClientRect();
    return { x: r.left, y: r.top };
  });
  expect(frame.s).toBeGreaterThan(0);
  const wx = fr.x + word.x + word.w / 2;
  const wy = fr.y + word.y + word.h / 2;
  await page.mouse.dblclick(wx, wy);
  await page.waitForTimeout(400);
  const selected = await stageEval<string>(page, 'return String(window.getSelection())');
  expect(selected.trim()).toBe('mundo');

  // dentro da edição, dois cliques em outra palavra também a selecionam
  const other = await stageEval<{ x: number; y: number; w: number; h: number }>(
    page,
    "var t=document.getElementById('t').firstChild;var r=document.createRange();r.setStart(t,10);r.setEnd(t,16);var b=r.getBoundingClientRect();return {x:b.left,y:b.top,w:b.width,h:b.height}"
  );
  await page.mouse.dblclick(fr.x + other.x + other.w / 2, fr.y + other.y + other.h / 2);
  await page.waitForTimeout(300);
  expect((await stageEval<string>(page, 'return String(window.getSelection())')).trim()).toBe(
    'bonito'
  );

  // barra de formatação: negrito no trecho; clicar fora confirma a edição
  const bold = await box(page, '#mm-fmt [data-fmt=bold]');
  await page.mouse.click(bold.cx, bold.cy);
  await page.waitForTimeout(200);
  const empty = await box(page, '.slide.active');
  await page.mouse.click(empty.x + 1500 * empty.s, empty.y + 900 * empty.s);
  await page.waitForTimeout(600);
  const html = await savedHtml(page);
  expect(html).toMatch(
    /<(b|strong)[^>]*>bonito<\/(b|strong)>|font-weight:\s*(bold|700)[^>]*>bonito/
  );
  expect(html).toContain('Olá mundo');
});

test('Menu de contexto do elemento traz as ações principais', async ({ page }) => {
  await boot(page, [
    `<section class="slide dark" data-notes="">${BOX('a', 'left:300px;top:300px;width:300px;height:300px')}</section>`,
  ]);
  const a = await box(page, '#a');
  await page.mouse.click(a.cx, a.cy, { button: 'right' });
  const menu = page.getByRole('menu', { name: 'Menu de contexto' });
  await expect(menu).toBeVisible();
  for (const label of ['Duplicar', 'Trazer para frente', 'Centralizar no slide', 'Excluir']) {
    await expect(menu.getByRole('menuitem', { name: new RegExp(label) })).toBeVisible();
  }
  await menu.getByRole('menuitem', { name: /Centralizar no slide/ }).click();
  await page.waitForTimeout(500);
  const c = await box(page, '#a');
  expect(Math.round(c.sx + c.sw / 2)).toBe(960);
  await expect(menu).toBeHidden();
});

test('Vídeo do computador entra no slide e fica parado no editor', async ({ page }) => {
  await boot(page, ['<section class="slide dark" data-notes=""></section>']);
  await page.getByTestId('video-input').setInputFiles({
    name: 'clip.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('000000186674797069736f6d', 'hex'),
  });
  await page.waitForTimeout(800);
  expect(await savedHtml(page)).toMatch(/<video[^>]+src="data:video\/mp4;base64,/);
  await expect(page.getByTestId('video-options')).toBeVisible();
});

test('Efeitos do dock funcionam em slide comum', async ({ page }) => {
  await boot(page, ['<section class="slide dark" data-notes=""></section>']);
  await page.getByRole('button', { name: 'Efeitos', exact: true }).click();
  await page.getByRole('menuitem', { name: /Contador de slides/ }).click();
  await page.waitForTimeout(500);
  expect(await savedHtml(page)).toContain('01 <span>/ 01</span>');
});

test('Lista de slides base rola e pode ser redimensionada', async ({ page }) => {
  await boot(page, ['<section class="slide dark" data-notes=""></section>']);
  const panel = page.getByTestId('bases-panel');
  const before = (await panel.boundingBox())!;
  const handle = page.getByRole('separator', { name: 'Redimensionar a lista de slides base' });
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2, hb.y - 80, { steps: 5 });
  await page.mouse.up();
  const after = (await panel.boundingBox())!;
  expect(after.height).toBeGreaterThan(before.height + 50);
  expect(
    await page.getByTestId('bases-list').evaluate((el) => getComputedStyle(el).overflowY)
  ).toBe('auto');
});
