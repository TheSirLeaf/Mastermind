import { Inspector } from '@components/Inspector/Inspector';
import { createDefaultDeck } from '@packages/core/deck';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

beforeEach(() => {
  useDeckStore.getState().setDeck(createDefaultDeck());
  useUIStore.getState().setInspectorTab('style');
});

describe('Inspector tabs', () => {
  it('marca a aba ativa e abre o painel de pacotes', () => {
    render(<Inspector />);

    expect(screen.getByRole('button', { name: 'Estilo' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Pacotes' }));

    expect(screen.getByRole('button', { name: 'Pacotes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Estilo' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Inserir elemento')).toBeInTheDocument();
  });

  it('volta ao estado vazio quando muda para uma aba sem seleção', () => {
    render(<Inspector />);

    fireEvent.click(screen.getByRole('button', { name: 'Conteúdo' }));

    expect(
      screen.getByText('Clique em um elemento do slide para selecioná-lo')
    ).toBeInTheDocument();
  });
});
