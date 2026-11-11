import { StyleTab } from '@components/Inspector/StyleTab';
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

const state = () => useDeckStore.getState();
const selection: SelectionInfo = { path: [0, 0], tag: 'div', label: 'Caixa' };

beforeEach(() => {
  state().setDeck({
    title: 'Estilo',
    slides: [
      {
        id: 's1',
        html: '<section class="slide"><div style="left:10%;top:20px;width:50%;height:30px;font-size:1.2rem">Caixa</div></section>',
      },
    ],
  });
});

describe('StyleTab', () => {
  it('preserva a unidade original de posição e tamanho', () => {
    render(<StyleTab selection={selection} />);

    fireEvent.change(screen.getByLabelText('X'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Largura'), { target: { value: '40' } });

    const html = state().deck.slides[0]?.html ?? '';
    expect(html).toContain('left: 20%;');
    expect(html).toContain('width: 40%;');
    expect(html).not.toContain('left: 20px');
    expect(html).not.toContain('width: 40px');
  });

  it('preserva a unidade da fonte', () => {
    render(<StyleTab selection={selection} />);

    fireEvent.change(screen.getByLabelText('Tamanho da fonte'), {
      target: { value: '2' },
    });

    const html = state().deck.slides[0]?.html ?? '';
    expect(html).toContain('font-size: 2rem;');
  });
});
