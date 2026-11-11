import { ContentTab } from '@components/Inspector/ContentTab';
import { createDefaultDeck } from '@packages/core/deck';
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const state = () => useDeckStore.getState();

beforeEach(() => {
  state().setDeck(createDefaultDeck());
});

describe('ContentTab', () => {
  it('não oferece textarea para container com elementos filhos', () => {
    const selection: SelectionInfo = { path: [1, 2], tag: 'div', label: 'Conteúdo' };
    render(<ContentTab selection={selection} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(/contém outros elementos/i)).toBeInTheDocument();
  });

  it('edita um parágrafo folha sem achatar o container', () => {
    const selection: SelectionInfo = { path: [1, 2, 0], tag: 'p', label: 'Lead' };
    render(<ContentTab selection={selection} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Texto atualizado' },
    });

    const html = state().deck.slides[1]?.html ?? '';
    expect(html).toContain('Texto atualizado');
    expect(html).toContain('<div class="content">');
    expect(html).not.toContain('Escreva aqui o texto do slide.');
  });
});
