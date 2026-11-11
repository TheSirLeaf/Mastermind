import { mutateSelectedElement, readSelectedElement } from '@components/Inspector/elementSelection';
import { createDefaultDeck } from '@packages/core/deck';
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { beforeEach, describe, expect, it } from 'vitest';

const state = () => useDeckStore.getState();

const titleSelection: SelectionInfo = {
  path: [1, 1],
  tag: 'h2',
  label: 'Título',
};

beforeEach(() => {
  state().setDeck(createDefaultDeck());
});

describe('elementSelection', () => {
  it('lê o elemento pelo path do iframe', () => {
    const element = readSelectedElement(titleSelection);
    expect(element?.tagName.toLowerCase()).toBe('h2');
    expect(element?.textContent).toBe('Título do slide');
  });

  it('grava a edição no slide correto sem passar o slide inteiro como innerHTML', () => {
    mutateSelectedElement(titleSelection, (element) => {
      element.textContent = 'Título editado';
    });

    const html = state().deck.slides[1]?.html ?? '';
    expect(html).toContain('<h2 class="title">Título editado</h2>');
    expect(html).toContain('<section');
  });

  it('ignora path inválido', () => {
    const before = state().deck.slides[1]?.html;
    mutateSelectedElement({ path: [1, 99], tag: 'h2', label: 'x' }, () => {
      throw new Error('não deveria mutar');
    });
    expect(state().deck.slides[1]?.html).toBe(before);
  });
});
