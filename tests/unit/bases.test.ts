import { describe, expect, it } from 'vitest';

import {
  applyBase,
  baseOwnId,
  makeBase,
  resolveDeckSlides,
  slideBaseId,
  slidesUsingBase,
  stripBaseLayer,
  upgradeBase,
  withBaseName,
  withSlideBaseId,
} from '../../src/packages/core/bases';
import { createDefaultDeck } from '../../src/packages/core/deck';
import { getModel } from '../../src/packages/core/models';
import { useDeckStore } from '../../src/store/deckStore';

describe('slides base', () => {
  it('o deck padrão usa bases e não repete rodapé nos slides', () => {
    const deck = createDefaultDeck();
    expect(deck.bases?.length).toBe(2);
    expect(slideBaseId(deck.slides[0]?.html ?? '')).toBe('mm-dark');
    expect(deck.slides[0]?.html).not.toContain('class="foot"');
  });

  it('aplica a camada da base, o tema e o contador', () => {
    const base = makeBase('b1', 'Claro', 'light');
    const html = '<section class="slide dark" data-base="b1"><h2>x</h2></section>';
    const out = applyBase(html, base, 2, 5);
    expect(out).toContain('class="mm-bgl light"');
    expect(out).toMatch(/^<section[^>]*class="slide light"/);
    expect(out).toContain('03 <span>/ 05</span>');
    expect(out.endsWith('</section>')).toBe(true);
  });

  it('remove a camada sem mexer no resto', () => {
    const base = makeBase('b1', 'Escuro', 'dark');
    const html = '<section class="slide dark" data-base="b1"><h2>x</h2></section>';
    const stripped = stripBaseLayer(applyBase(html, base, 0, 1));
    expect(stripped).not.toContain('mm-bgl');
    expect(stripped).toContain('<h2>x</h2>');
  });

  it('resolve todos os slides e lista os que usam cada base', () => {
    const deck = createDefaultDeck();
    expect(resolveDeckSlides(deck).every((html) => html.includes('mm-bgl'))).toBe(true);
    expect(slidesUsingBase(deck, 'mm-dark')).toEqual([0, 1]);
    expect(slidesUsingBase(deck, 'mm-light')).toEqual([]);
    expect(withSlideBaseId('<section class="slide"></section>', 'x')).toContain('data-base="x"');
  });

  it('modelos trazem bases com id próprio', () => {
    const model = getModel('minimal');
    expect(model.bases().map((b) => baseOwnId(b.html))).toEqual(['min-base']);
  });

  it('adiciona slide de outro modelo trazendo a base dele', () => {
    useDeckStore.getState().setDeck(createDefaultDeck());
    useDeckStore.getState().addSlideFromModel('minimal', 1);
    const { deck, currentIndex } = useDeckStore.getState();
    expect(deck.slides).toHaveLength(3);
    expect(currentIndex).toBe(1);
    expect(deck.bases?.some((b) => baseOwnId(b.html) === 'min-base')).toBe(true);
  });

  it('excluir uma base move os slides dela para outra', () => {
    useDeckStore.getState().setDeck(createDefaultDeck());
    const count = useDeckStore.getState().deck.slides.length;
    useDeckStore.getState().deleteSlide(count); // primeira base (mm-dark)
    const { deck } = useDeckStore.getState();
    expect(deck.bases).toHaveLength(1);
    expect(slideBaseId(deck.slides[0]?.html ?? '')).toBe('mm-light');
  });

  it('copia e cola um slide', () => {
    useDeckStore.getState().setDeck(createDefaultDeck());
    useDeckStore.getState().copySlide(0);
    expect(useDeckStore.getState().pasteSlide()).toBe(true);
    expect(useDeckStore.getState().deck.slides).toHaveLength(3);
    expect(useDeckStore.getState().currentIndex).toBe(1);
  });
});

describe('bases órfãs e nomes', () => {
  it('slide com base inexistente perde o data-base na versão resolvida', () => {
    const deck = createDefaultDeck();
    deck.bases = [];
    expect(resolveDeckSlides(deck)[0]).not.toContain('data-base=');
  });

  it('renomear apara espaços', () => {
    expect(withBaseName('<section class="slide" data-base-id="a"></section>', '  Meu  ')).toContain(
      'data-base-name="Meu"'
    );
  });
});

describe('migração de bases antigas', () => {
  it('base clara antiga ganha o fundo claro e os elementos de luz', () => {
    const old = { id: 'x', html: '<section class="slide light" data-base-id="a"></section>' };
    const upgraded = upgradeBase(old);
    expect(upgraded.html).toContain('background:linear-gradient(155deg,#FFF8F5');
    expect(upgraded.html).toContain('data-fx="1"');
    expect(upgradeBase(upgraded)).toBe(upgraded);
  });
});
