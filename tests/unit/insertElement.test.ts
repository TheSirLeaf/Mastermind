import { createDefaultDeck } from '@packages/core/deck';
import { useDeckStore } from '@store/deckStore';
import { beforeEach, describe, expect, it } from 'vitest';

import { insertElement } from '../../src/editor/insertElement';

describe('insertElement', () => {
  beforeEach(() => {
    useDeckStore.getState().setDeck(createDefaultDeck());
    useDeckStore.setState({ currentIndex: 0 });
  });

  it('insere um retângulo posicionado e persiste no slide', () => {
    const result = insertElement('rect');
    expect(result).not.toBeNull();
    expect(result?.label).toBe('Retângulo');

    const slide = useDeckStore.getState().deck.slides[0];
    expect(slide?.html).toContain('position:absolute');
    expect(slide?.html).toContain('background:#F7D98B');
    expect(slide?.html).toContain('width:600px');
  });

  it('insere texto editável e pede a seleção do novo elemento', () => {
    const result = insertElement('text');
    const state = useDeckStore.getState();
    expect(state.deck.slides[0]?.html).toContain('Digite seu texto');
    expect(result?.path[0]).toBe(0);
    expect(result?.path.length).toBeGreaterThan(1);
    expect(state.pendingSelection).toEqual(result?.path);
  });

  it('não insere imagem sem src', () => {
    expect(insertElement('image')).toBeNull();
  });

  it('insere imagem com src', () => {
    insertElement('image', { src: 'data:image/png;base64,AAAA' });
    expect(useDeckStore.getState().deck.slides[0]?.html).toContain('data:image/png;base64,AAAA');
  });
});
