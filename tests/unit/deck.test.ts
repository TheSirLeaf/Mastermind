import { describe, expect, it } from 'vitest';

import {
  SLIDE_TEMPLATE_KINDS,
  createDefaultDeck,
  makeSlide,
  renumberFooters,
  slideBackground,
  slideNotes,
  slideTemplateHTML,
  slideTheme,
  slideTitle,
  withFooter,
  withSlideBackground,
  withSlideClass,
} from '../../src/packages/core/deck';

describe('deck helpers', () => {
  it('cria dois slides por padrão', () => {
    const deck = createDefaultDeck();
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]?.html).toContain('<section class="slide dark cover"');
    expect(deck.slides[0]?.html).not.toContain('{FOOT}');
  });

  it('substitui {FOOT}', () => {
    expect(withFooter('<p>{FOOT}</p>', '<div>rodapé</div>')).toBe('<p><div>rodapé</div></p>');
  });

  it('renumera os rodapés', () => {
    const slides = [
      makeSlide('<section class="slide"><div class="foot-r">00 <span>/ 00</span></div></section>'),
      makeSlide('<section class="slide"><div class="foot-r">00 <span>/ 00</span></div></section>'),
    ];
    const result = renumberFooters(slides);
    expect(result[0]?.html).toContain('01 <span>/ 02</span>');
    expect(result[1]?.html).toContain('02 <span>/ 02</span>');
  });

  it('extrai título, com <br> virando espaço', () => {
    expect(
      slideTitle('<section><h1 class="display">Olá<br><span>mundo</span></h1></section>')
    ).toBe('Olá mundo');
  });

  it('usa eyebrow quando não há título', () => {
    expect(slideTitle('<section><div class="eyebrow">SEÇÃO</div></section>')).toBe('SEÇÃO');
  });

  it('extrai notes', () => {
    expect(slideNotes('<section data-notes="falar devagar">x</section>')).toBe('falar devagar');
    expect(slideNotes('<section>x</section>')).toBe('');
  });
});

describe('modelos de slide', () => {
  it('cada modelo gera uma <section class="slide"> com {FOOT}', () => {
    for (const kind of SLIDE_TEMPLATE_KINDS) {
      const html = slideTemplateHTML(kind);
      expect(html.startsWith('<section class="slide'), kind).toBe(true);
      expect(html, kind).toContain('{FOOT}');
    }
  });

  it('troca o tema e o fundo preservando as demais classes', () => {
    const html = withSlideClass(slideTemplateHTML('cover'), 'light');
    expect(slideTheme(html)).toBe('light');
    expect(html).toContain('cover');

    const painted = withSlideBackground(html, '#112233');
    expect(slideBackground(painted)).toBe('rgb(17, 34, 51)');
    expect(slideBackground(withSlideBackground(painted, null))).toBe('');
  });
});
