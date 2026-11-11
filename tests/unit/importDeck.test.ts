import { describe, expect, it } from 'vitest';

import { looksLikeDeckHTML, parseDeckHTML } from '../../src/packages/core/importDeck';

const html = `<!doctype html><html><head><title>Deck Antigo</title></head><body>
<div id="stage"><div id="deck">
  <section class="slide dark cover" data-notes="abertura">
    <h1 class="display">Capa</h1>
    <div class="foot"><div class="foot-l">X</div><div class="foot-r">07 <span>/ 09</span></div></div>
  </section>
  <section class="slide light" data-notes="segundo">
    <h2 class="title">Segundo</h2>
    <div class="foot"><div class="foot-l">X</div><div class="foot-r">08 <span>/ 09</span></div></div>
  </section>
</div></div>
<div id="mm-sel"></div>
</body></html>`;

describe('parseDeckHTML', () => {
  it('extrai título e slides na ordem', () => {
    const deck = parseDeckHTML(html);
    expect(deck.title).toBe('Deck Antigo');
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]?.html).toContain('class="slide dark cover"');
    expect(deck.slides[1]?.html).toContain('Segundo');
  });

  it('renumera os rodapés para o novo deck', () => {
    const deck = parseDeckHTML(html);
    expect(deck.slides[0]?.html).toContain('01 <span>/ 02</span>');
    expect(deck.slides[1]?.html).toContain('02 <span>/ 02</span>');
  });

  it('remove artefatos do editor', () => {
    const deck = parseDeckHTML(html.replace('<div id="mm-sel"></div>', '<div id="mm-sel"></div>'));
    expect(deck.slides.every((slide) => !slide.html.includes('mm-sel'))).toBe(true);
  });

  it('aceita deck sem #deck', () => {
    const deck = parseDeckHTML(
      '<section class="slide">A</section><section class="slide">B</section>'
    );
    expect(deck.slides).toHaveLength(2);
    expect(deck.title).toBe('Apresentação importada');
  });

  it('usa título fornecido', () => {
    const deck = parseDeckHTML('<section class="slide">A</section>', { title: 'Meu deck' });
    expect(deck.title).toBe('Meu deck');
  });

  it('falha quando não há slides', () => {
    expect(() => parseDeckHTML('<html><body><p>nada</p></body></html>')).toThrow(/nenhum slide/i);
    expect(() => parseDeckHTML('')).toThrow(/vazio/i);
  });

  it('detecta HTML de deck', () => {
    expect(looksLikeDeckHTML(html)).toBe(true);
    expect(looksLikeDeckHTML('<html><body><p>oi</p></body></html>')).toBe(false);
  });
});
