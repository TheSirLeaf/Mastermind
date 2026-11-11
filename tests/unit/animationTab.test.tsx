import { AnimationTab } from '@components/Inspector/AnimationTab';
import { createDefaultDeck } from '@packages/core/deck';
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const state = () => useDeckStore.getState();
const selection: SelectionInfo = { path: [1, 1], tag: 'h2', label: 'Título' };

beforeEach(() => {
  state().setDeck(createDefaultDeck());
});

describe('AnimationTab', () => {
  it('ativa a animação padrão e grava o contrato no slide', () => {
    render(<AnimationTab selection={selection} />);

    fireEvent.click(screen.getByRole('button', { name: 'Animar' }));

    const html = state().deck.slides[1]?.html ?? '';
    expect(html).toContain('class="title anim"');
    expect(html).toContain('data-anim="rise"');
    expect(html).toContain('--anim-duration: 0.85s');
  });

  it('aplica um preset e permite remover a animação', () => {
    render(<AnimationTab selection={selection} />);

    fireEvent.click(screen.getByRole('button', { name: /Sutil/ }));

    const animated = state().deck.slides[1]?.html ?? '';
    expect(animated).toContain('data-anim="rise"');
    expect(animated).toContain('--anim-duration: 0.6s');

    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    const removed = state().deck.slides[1]?.html ?? '';
    expect(removed).not.toContain('class="title anim"');
    expect(removed).not.toContain('data-anim="rise"');
  });
});
