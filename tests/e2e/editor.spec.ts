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
  const bar = page.getByTestId('text-format-bar');
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: /Negrito/ }).click();
  await page.waitForTimeout(200);
  await expect(bar.getByRole('button', { name: /Negrito/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  // tamanho de 1 em 1 (antes, passos pequenos não mudavam nada)
  const sizeBox = bar.getByLabel('Tamanho do trecho em px');
  await expect(sizeBox).toHaveValue('60');
  await bar.getByRole('button', { name: 'Aumentar o tamanho' }).click();
  await expect(sizeBox).toHaveValue('61');
  await bar.getByRole('button', { name: 'Aumentar o tamanho' }).click();
  await bar.getByRole('button', { name: 'Diminuir o tamanho' }).click();
  await expect(sizeBox).toHaveValue('61');
  // outra fonte só no trecho
  await bar.getByRole('button', { name: 'Fonte', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Georgia' }).click();
  await page.waitForTimeout(200);
  // cor pelo seletor do app
  await bar.getByRole('button', { name: 'Cor do trecho' }).click();
  await page
    .getByRole('dialog', { name: 'Seletor de cor' })
    .getByLabel('Cor #F7D98B')
    .last()
    .click();
  await page.waitForTimeout(200);
  // efeito avançado: gradiente
  await bar.getByRole('button', { name: 'Efeitos avançados' }).click();
  await page.getByTestId('text-advanced').getByRole('radio', { name: 'Gradiente' }).click();
  await page.waitForTimeout(200);
  // Esc sai da edição guardando tudo (antes, descartava)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await bar.count()) await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const html = await savedHtml(page);
  expect(html).toMatch(/<(b|strong)[^>]*>(<span[^>]*>)?bonito/);
  expect(html).toContain('Olá mundo');
  const span = await page.evaluate((h) => {
    const doc = new DOMParser().parseFromString(h, 'text/html');
    const el = [...doc.querySelectorAll('#t span')].find((x) => x.textContent === 'bonito');
    return el ? (el as HTMLElement).getAttribute('style') : null;
  }, html);
  expect(span).toContain('font-size: 61px');
  expect(span).toContain('Georgia');
  expect(span).toContain('linear-gradient');
  // o resto do texto não mudou
  expect(html).toMatch(/Olá mundo <span|Olá mundo <(b|strong)/);
});

test('Dois cliques num elemento que vaza não arrasta o slide', async ({ page }) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p class="ed-obj ed-text" id="t" style="position:absolute;left:1500px;top:700px;width:900px;font-size:60px">Texto que vaza do slide</p></section>',
  ]);
  const t = await box(page, '#t');
  const visibleX = t.x + 40;
  await page.mouse.click(visibleX, t.cy);
  await page.waitForTimeout(200);
  await page.mouse.dblclick(visibleX, t.cy);
  await page.waitForTimeout(400);
  await page.keyboard.press('End');
  await page.keyboard.type(' mais');
  await page.waitForTimeout(300);
  const scroll = await stageEval<number>(
    page,
    "var s=document.querySelector('.slide.active');return s.scrollLeft+s.scrollTop+document.getElementById('deck').scrollLeft"
  );
  expect(scroll).toBe(0);
  const after = await box(page, '#t');
  expect(Math.round(after.sx)).toBe(1500);
});

test('A barra de formatação acompanha o texto ao dar zoom', async ({ page }) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p class="ed-obj ed-text" id="t" style="position:absolute;left:300px;top:400px;width:1200px;font-size:60px">Olá mundo bonito</p></section>',
  ]);
  const t = await box(page, '#t');
  await page.mouse.dblclick(t.x + 30, t.cy);
  await page.waitForTimeout(400);
  const bar = page.getByTestId('text-format-bar');
  await expect(bar).toBeVisible();
  const word = async () => {
    const b = await box(page, '#t');
    return b;
  };
  const before = (await bar.boundingBox())!;
  const w0 = await word();
  expect(Math.abs(before.y + before.height - w0.y)).toBeLessThan(40);
  // zoom com Ctrl + roda sobre o palco
  await page.mouse.move(w0.x + 30, w0.cy);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -400);
  await page.keyboard.up('Control');
  await page.waitForTimeout(900);
  const w1 = await word();
  const after = (await bar.boundingBox())!;
  expect(Math.abs(w1.w - w0.w)).toBeGreaterThan(5);
  expect(Math.abs(after.y + after.height - w1.y)).toBeLessThan(40);
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

/** Abre a edição com a palavra na posição [start, end) do texto #t selecionada. */
async function selectWord(page: Page, start: number, end: number) {
  const t = await box(page, '#t');
  await page.mouse.dblclick(t.x + 30, t.cy);
  await page.waitForTimeout(300);
  await stageEval(
    page,
    `var t=document.getElementById('t');var w=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);
     var r=document.createRange();var pos=0;var n;
     while((n=w.nextNode())){var len=n.nodeValue.length;
       if(pos<=${start}&&${start}<=pos+len&&!r.__s){r.setStart(n,${start}-pos);r.__s=1;}
       if(pos<=${end}&&${end}<=pos+len){r.setEnd(n,${end}-pos);break;}
       pos+=len;}
     var s=getSelection();s.removeAllRanges();s.addRange(r);`
  );
  await page.waitForTimeout(250);
}

async function spanStyle(page: Page, text: string): Promise<string | null> {
  return stageEval<string | null>(
    page,
    `var el=[].slice.call(document.querySelectorAll('#t span')).find(function(x){return x.textContent===${JSON.stringify(text)}});return el?el.getAttribute('style'):null`
  );
}

test('Efeitos avançados do trecho: gradiente em itálico sem cortar, contorno, sombras e reflexo', async ({
  page,
}) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p class="ed-obj ed-text" id="t" style="position:absolute;left:200px;top:300px;width:1500px;font-size:90px;font-style:italic">Olá mundo final</p></section>',
  ]);
  await selectWord(page, 10, 15);
  const bar = page.getByTestId('text-format-bar');
  await bar.getByRole('button', { name: 'Efeitos avançados' }).click();
  const panel = page.getByTestId('text-advanced');
  await panel.getByRole('radio', { name: 'Gradiente' }).click();
  await panel.getByRole('button', { name: 'Adicionar cor' }).click();
  await expect(panel.getByTestId('gradient-stop')).toHaveCount(3);
  await page.waitForTimeout(200);

  // a caixa do gradiente passa da última letra (itálico): o fundo cobre a ponta inclinada
  const clip = await stageEval<{ pad: number; margin: number; gap: number }>(
    page,
    `var el=[].slice.call(document.querySelectorAll('#t span')).find(function(x){return x.textContent==='final'});
     var cs=getComputedStyle(el);var r=document.createRange();r.selectNodeContents(el);
     var rects=r.getClientRects();var last=rects[rects.length-1];var box=el.getBoundingClientRect();
     return {pad:parseFloat(cs.paddingRight),margin:parseFloat(cs.marginRight),gap:box.right-last.right}`
  );
  expect(clip.pad).toBeGreaterThan(10);
  expect(clip.margin).toBeCloseTo(-clip.pad, 0);
  // gap em px de tela; a folga é de 0,2em (18px do slide)
  const scale = (await box(page, '.slide.active')).s;
  expect(clip.gap / scale).toBeGreaterThan(14);

  // contorno
  await panel.getByRole('button', { name: 'Contorno' }).click();
  await panel.getByRole('radio', { name: 'Por fora' }).click();
  // sombra: preset + camada extra personalizada
  await panel.getByRole('button', { name: 'Sombra' }).click();
  await panel.getByRole('button', { name: 'Suave' }).click();
  await panel.getByRole('button', { name: 'Adicionar sombra' }).click();
  await expect(panel.getByTestId('shadow-layer')).toHaveCount(2);
  await panel.getByTestId('shadow-layer').nth(1).getByLabel('X').fill('12');
  // reflexo (caixa toda)
  await panel.getByRole('button', { name: 'Reflexo' }).click();
  await panel.getByRole('radio', { name: 'Abaixo' }).click();
  await page.waitForTimeout(300);

  const style = (await spanStyle(page, 'final')) ?? '';
  expect(style).toMatch(
    /linear-gradient\(90deg, rgb\(247, 217, 139\) 0%, rgb\(199, 124, 138\) 50%, rgb\(199, 124, 138\) 100%\)/
  );
  // por fora + gradiente: contorno feito de sombras duras (a letra é transparente)
  expect(style).toMatch(/drop-shadow\(rgb\(16, 6, 11\) 3px 0px 0px\)/);
  // com gradiente, as sombras viram drop-shadow (blur pela metade)
  expect(style).toMatch(/filter: .*drop-shadow\(.*12px 6px 8px/);
  const reflect = await stageEval<string>(
    page,
    "return document.getElementById('t').style.getPropertyValue('-webkit-box-reflect')"
  );
  expect(reflect).toContain('below');

  // a configuração guardada volta ao reabrir o painel (outro trecho e de volta)
  // o painel continua aberto e acompanha o trecho selecionado
  const gradientRadio = page.getByTestId('text-advanced').getByRole('radio', { name: 'Gradiente' });
  await page.getByTestId('text-advanced').getByRole('button', { name: 'Preenchimento' }).click();
  await selectWord(page, 0, 3);
  await expect(gradientRadio).toHaveAttribute('aria-checked', 'false');
  await selectWord(page, 10, 15);
  await expect(
    page.getByTestId('text-advanced').getByRole('radio', { name: 'Gradiente' })
  ).toHaveAttribute('aria-checked', 'true');

  // Esc grava; o HTML do slide guarda os efeitos
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await bar.count()) await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const html = await savedHtml(page);
  expect(html).toContain('data-fx=');
  expect(html).toContain('data-reflect=');
});

test('Trecho dentro de outro com gradiente não fica invisível', async ({ page }) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p class="ed-obj ed-text" id="t" style="position:absolute;left:200px;top:300px;width:1500px;font-size:90px">Olá mundo final</p></section>',
  ]);
  await selectWord(page, 0, 15);
  const bar = page.getByTestId('text-format-bar');
  await bar.getByRole('button', { name: 'Efeitos avançados' }).click();
  await page.getByTestId('text-advanced').getByRole('radio', { name: 'Gradiente' }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // dentro do trecho com gradiente, "mundo" vira cor sólida
  await selectWord(page, 4, 9);
  await bar.getByRole('button', { name: 'Cor do trecho' }).click();
  await page
    .getByRole('dialog', { name: 'Seletor de cor' })
    .getByLabel('Cor #F7D98B')
    .first()
    .click();
  await page.waitForTimeout(300);
  const fill = await stageEval<string>(
    page,
    "var el=[].slice.call(document.querySelectorAll('#t span')).find(function(x){return x.textContent==='mundo'});return getComputedStyle(el).webkitTextFillColor"
  );
  expect(fill).toBe('rgb(247, 217, 139)');
});

test('Inspetor: mesmas fontes, tamanho e efeitos de texto para a caixa toda', async ({ page }) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p class="ed-obj ed-text" id="t" style="position:absolute;left:200px;top:300px;width:1500px">Olá mundo</p></section>',
  ]);
  const t = await box(page, '#t');
  await page.mouse.click(t.x + 30, t.cy);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Tipografia' }).click();
  // tamanho herdado (sem tamanho próprio) sobe de 1 em 1
  const size = page.getByLabel('Tamanho da fonte');
  const before = Number(await size.inputValue());
  expect(before).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Aumentar o tamanho' }).click();
  await expect(size).toHaveValue(String(before + 1));
  await page.getByRole('button', { name: 'Fonte', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Cormorant Garamond' }).click();
  await page.getByRole('button', { name: 'Efeitos de texto' }).click();
  const panel = page.getByTestId('text-advanced');
  await panel.getByRole('radio', { name: 'Gradiente' }).click();
  await panel.getByRole('button', { name: 'Sombra' }).click();
  await panel.getByRole('button', { name: 'Neon' }).click();
  await page.waitForTimeout(500);
  const html = await savedHtml(page);
  expect(html).toContain(`font-size: ${before + 1}px`);
  expect(html).toContain('Cormorant Garamond');
  expect(html).toContain('linear-gradient');
  expect(html).toContain('drop-shadow');
  expect(html).toContain('data-fx=');
});

test('Clicar no nome do pai seleciona o pai', async ({ page }) => {
  await boot(page, [
    `<section class="slide dark" data-notes=""><div class="ed-obj ed-shape" id="pai" data-name="Moldura" style="position:absolute;left:200px;top:200px;width:800px;height:500px;background:#355"><div class="ed-obj ed-shape" id="f" style="position:absolute;left:100px;top:100px;width:200px;height:200px;background:#c55"></div></div></section>`,
  ]);
  const f = await box(page, '#f');
  await page.mouse.click(f.cx, f.cy);
  await page.waitForTimeout(300);
  await page.getByTestId('parent-row').getByRole('button', { name: 'Moldura' }).click();
  await page.waitForTimeout(400);
  const path = await page.evaluate(async () => {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const imp = (window as unknown as { __imp: (p: string) => Promise<any> }).__imp;
    const m = await imp('/src/store/deckStore.ts');
    return m.useDeckStore.getState().selection?.path as number[];
  });
  expect(path).toEqual([0, 0]);
  await expect(page.getByTestId('parent-row')).toContainText('Sem pai');
});

test('A barra desliza junto com o trecho em vez de pular', async ({ page }) => {
  await boot(page, [
    '<section class="slide dark" data-notes=""><p class="ed-obj ed-text" id="t" style="position:absolute;left:600px;top:400px;width:900px;font-size:60px">Olá mundo bonito</p></section>',
  ]);
  await selectWord(page, 4, 9);
  const bar = page.getByTestId('text-format-bar');
  await expect(bar).toBeVisible();
  // aproxima (sem animação) e depois volta ao slide com a câmera animada
  const w = await box(page, '#t');
  await page.mouse.move(w.cx, w.cy);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  await page.waitForTimeout(500);
  // posições amostradas durante um zoom animado: muitas e próximas entre si (sem saltos)
  const samples = await page.evaluate(async () => {
    const el = document.querySelector('[data-testid="text-format-bar"]') as HTMLElement;
    const out: number[] = [];
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Ir para o slide atual'
    );
    btn?.click();
    const t0 = performance.now();
    while (performance.now() - t0 < 900) {
      await new Promise((r) => requestAnimationFrame(r));
      out.push(el.getBoundingClientRect().top);
    }
    return out;
  });
  const distinct = new Set(samples.map((v) => Math.round(v))).size;
  const jumps = samples.slice(1).map((v, i) => Math.abs(v - samples[i]!));
  expect(distinct).toBeGreaterThan(5);
  expect(Math.max(...jumps)).toBeLessThan(60);
});
