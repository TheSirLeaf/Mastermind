import { describe, expect, it } from 'vitest';

import {
  defaultSlideLayout,
  SLIDE_GAP,
  SLIDE_W,
  slideLayout,
  slideTransition,
  withSlideLayout,
  withSlideTransition,
} from '../../src/packages/core/deck';

const html = '<section class="slide dark" data-notes=""><h1>Oi</h1></section>';

describe('layout do slide no espaço', () => {
  it('usa a posição padrão (lado a lado) quando não há atributos', () => {
    expect(slideLayout(html, 2)).toEqual(defaultSlideLayout(2));
    expect(defaultSlideLayout(1).x).toBe(SLIDE_W + SLIDE_GAP);
  });

  it('grava e lê posição e escala', () => {
    const moved = withSlideLayout(html, { x: 100.4, y: 50, s: 0.5 });
    expect(slideLayout(moved, 0)).toEqual({ x: 100, y: 50, s: 0.5 });
  });

  it('escala 1 não deixa atributo e null volta ao padrão', () => {
    const scaled = withSlideLayout(html, { s: 0.5 });
    expect(withSlideLayout(scaled, { s: 1 })).not.toContain('data-s');
    const reset = withSlideLayout(withSlideLayout(html, { x: 9, y: 9, s: 2 }), null);
    expect(reset).not.toContain('data-x');
    expect(slideLayout(reset, 1)).toEqual(defaultSlideLayout(1));
  });

  it('ignora escala inválida', () => {
    expect(slideLayout('<section class="slide" data-s="-3"></section>', 0).s).toBe(1);
  });
});

describe('transição do slide', () => {
  it('padrão não grava atributo; outras ficam em data-transition', () => {
    expect(slideTransition(html)).toBe('default');
    const moved = withSlideTransition(html, 'move');
    expect(moved).toContain('data-transition="move"');
    expect(slideTransition(moved)).toBe('move');
    expect(withSlideTransition(moved, 'default')).not.toContain('data-transition');
  });

  it('valor desconhecido cai no padrão', () => {
    expect(slideTransition('<section class="slide" data-transition="xyz"></section>')).toBe(
      'default'
    );
  });
});

describe('transições extras', () => {
  const html = '<section class="slide dark"></section>';

  it('aceita instantâneo e transição de pacote', () => {
    expect(slideTransition(withSlideTransition(html, 'instant'))).toBe('instant');
    expect(slideTransition(withSlideTransition(html, 'pkg:code:glitch'))).toBe('pkg:code:glitch');
  });

  it('ignora valores inválidos', () => {
    expect(slideTransition('<section data-transition="pkg:a b:c"></section>')).toBe('default');
  });
});
