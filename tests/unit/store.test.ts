import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultDeck } from '../../src/packages/core/deck';
import { useDeckStore } from '../../src/store/deckStore';

const state = () => useDeckStore.getState();

beforeEach(() => {
  state().setDeck(createDefaultDeck());
});

describe('deckStore', () => {
  it('começa com dois slides e índice 0', () => {
    expect(state().deck.slides).toHaveLength(2);
    expect(state().currentIndex).toBe(0);
    expect(state().canUndo).toBe(false);
  });

  it('adiciona, duplica e exclui slides', () => {
    state().addSlide();
    expect(state().deck.slides).toHaveLength(3);
    expect(state().currentIndex).toBe(2);

    state().duplicateSlide(0);
    expect(state().deck.slides).toHaveLength(4);
    expect(state().currentIndex).toBe(1);

    state().deleteSlide(1);
    expect(state().deck.slides).toHaveLength(3);
    expect(state().currentIndex).toBe(1);
  });

  it('não deixa excluir o último slide', () => {
    state().deleteSlide(0);
    state().deleteSlide(0);
    expect(state().deck.slides).toHaveLength(1);
    state().deleteSlide(0);
    expect(state().deck.slides).toHaveLength(1);
  });

  it('move um slide e acompanha o índice', () => {
    const firstId = state().deck.slides[0]?.id;
    state().moveSlide(0, 1);
    expect(state().deck.slides[1]?.id).toBe(firstId);
    expect(state().currentIndex).toBe(1);
  });

  it('atualiza o HTML de um elemento pelo path do iframe', () => {
    // Slide 1 (texto): filhos [eyebrow, h2.title, content, foot]
    state().updateElementHTML([1, 1], 'Título editado');
    const html = state().deck.slides[1]?.html ?? '';
    expect(html).toContain('<h2 class="title">Título editado</h2>');
    expect(html).not.toContain('Título do slide');
  });

  it('ignora path inválido', () => {
    const before = state().deck.slides[1]?.html;
    state().updateElementHTML([1, 99], 'x');
    state().updateElementHTML([42, 0], 'x');
    state().updateElementHTML([1], 'x');
    expect(state().deck.slides[1]?.html).toBe(before);
  });

  it('desfaz e refaz edições', () => {
    vi.useFakeTimers();
    state().updateElementHTML([1, 1], 'Primeiro');
    vi.advanceTimersByTime(700);
    state().updateElementHTML([1, 1], 'Segundo');
    vi.useRealTimers();
    expect(state().canUndo).toBe(true);
    expect(state().canRedo).toBe(false);

    state().undo();
    expect(state().deck.slides[1]?.html).toContain('Primeiro');

    state().undo();
    expect(state().deck.slides[1]?.html).toContain('Título do slide');

    state().redo();
    expect(state().deck.slides[1]?.html).toContain('Primeiro');
  });

  it('agrupa digitação contínua em um passo de histórico', () => {
    state().updateElementHTML([1, 1], 'A');
    state().updateElementHTML([1, 1], 'AB');
    state().undo();
    expect(state().deck.slides[1]?.html).toContain('Título do slide');
  });

  it('atualiza notas do apresentador', () => {
    state().updateSlideNotes(0, 'falar devagar');
    expect(state().deck.slides[0]?.html).toContain('data-notes="falar devagar"');
  });

  it('atualiza o título e seleciona slide', () => {
    state().setTitle('Novo título');
    state().selectSlide(1);
    expect(state().deck.title).toBe('Novo título');
    expect(state().currentIndex).toBe(1);
    state().selectSlide(-1);
    expect(state().currentIndex).toBe(1);
  });
});
