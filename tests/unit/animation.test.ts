import { describe, expect, it } from 'vitest';

import {
  ANIMATION_CSS,
  ANIMATION_DEFAULTS,
  ANIMATION_PRESETS,
  animationDuration,
  animationPatch,
  applyAnimation,
  applyElementPatch,
  normalizeAnimation,
  readAnimation,
  readAnimationAtPath,
} from '../../src/packages/core/animation';
import { buildEditorHTML, buildPresentationHTML } from '../../src/packages/core/export';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import { useDeckStore } from '../../src/store/deckStore';

const template =
  '<!doctype html><html><head><title>{{TITLE}}</title></head><body><div id="deck">{{SLIDES}}</div></body></html>';

function element(): HTMLElement {
  const el = document.createElement('p');
  el.className = 'lead';
  document.body.appendChild(el);
  return el;
}

describe('animação de elementos', () => {
  it('aplica e lê todos os atributos canônicos', () => {
    const el = element();
    applyAnimation(el, {
      kind: 'slide',
      direction: 'left',
      delay: 0.4,
      duration: 0.9,
      easing: 'ease-out',
      distance: 48,
    });

    expect(el.classList.contains('anim')).toBe(true);
    expect(el.getAttribute('data-anim')).toBe('slide');
    expect(el.getAttribute('data-anim-dir')).toBe('left');
    expect(el.style.getPropertyValue('--d')).toBe('0.4s');
    expect(el.style.getPropertyValue('--anim-duration')).toBe('0.9s');
    expect(el.style.getPropertyValue('--anim-ease')).toBe('ease-out');
    expect(el.style.getPropertyValue('--anim-distance')).toBe('48px');
    expect(readAnimation(el)).toEqual({
      kind: 'slide',
      direction: 'left',
      delay: 0.4,
      duration: 0.9,
      easing: 'ease-out',
      distance: 48,
    });

    applyAnimation(el, null);
    expect(el.classList.contains('anim')).toBe(false);
    expect(el.hasAttribute('data-anim')).toBe(false);
    expect(el.style.getPropertyValue('--d')).toBe('');
    expect(readAnimation(el)).toBeNull();
  });

  it('lê o rise legado quando não há data-anim', () => {
    const el = element();
    el.classList.add('anim');
    el.style.setProperty('--d', '0.25s');
    expect(readAnimation(el)).toEqual({
      ...ANIMATION_DEFAULTS,
      delay: 0.25,
    });
  });

  it('normaliza valores fora da faixa e preserva classes existentes', () => {
    const el = element();
    expect(
      normalizeAnimation({
        kind: 'zoom',
        direction: 'right',
        delay: -3,
        duration: 99,
        distance: 999,
      })
    ).toMatchObject({
      kind: 'zoom',
      direction: 'right',
      delay: 0,
      duration: 5,
      distance: 400,
    });

    applyElementPatch(el, animationPatch(ANIMATION_PRESETS[0]?.animation ?? ANIMATION_DEFAULTS));
    expect(el.className).toContain('lead');
    expect(el.className).toContain('anim');
    expect(animationDuration(readAnimation(el))).toBeGreaterThan(0);
  });

  it('expõe presets e CSS com keyframes, static e reduced motion', () => {
    expect(ANIMATION_PRESETS.map((preset) => preset.id)).toEqual([
      'sutil',
      'rapido',
      'dramatico',
      'lateral',
      'desfoque',
    ]);
    expect(ANIMATION_CSS).toContain('@keyframes mmRise');
    expect(ANIMATION_CSS).toContain('@keyframes mmBlur');
    expect(ANIMATION_CSS).toContain('mm-static');
    expect(ANIMATION_CSS).toContain('prefers-reduced-motion');
  });

  it('injeta o CSS no export e no documento do editor', () => {
    const registry = new PackageRegistry();
    const deck = {
      title: 'Teste',
      slides: [{ id: 's1', html: '<section class="slide dark"><p>Oi</p></section>' }],
    };
    const exported = buildPresentationHTML({ template, deck, registry });
    const editor = buildEditorHTML(deck, registry, template);
    expect(exported).toContain('<style id="mm-anim">');
    expect(exported).toContain('@keyframes mmSlideLeft');
    expect(editor).toContain('<style id="mm-anim">');
  });

  it('persiste o patch no store e permite undo', () => {
    useDeckStore.getState().setDeck({
      title: 'Patch',
      slides: [{ id: 's1', html: '<section class="slide dark"><p class="lead">Oi</p></section>' }],
    });
    useDeckStore
      .getState()
      .patchElement(
        [0, 0],
        animationPatch(
          ANIMATION_PRESETS.find((preset) => preset.id === 'dramatico')?.animation ?? null
        )
      );

    const saved = useDeckStore.getState().deck.slides[0]?.html ?? '';
    expect(saved).toContain('class="lead anim"');
    expect(saved).toContain('data-anim="zoom"');
    expect(readAnimationAtPath(saved, [0, 0])?.kind).toBe('zoom');
    expect(useDeckStore.getState().canUndo).toBe(true);

    useDeckStore.getState().undo();
    expect(useDeckStore.getState().deck.slides[0]?.html).toContain('<p class="lead">Oi</p>');
  });
});
