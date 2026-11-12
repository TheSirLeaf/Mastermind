import { StyleTab } from '@components/Inspector/StyleTab';
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
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
    useUIStore.getState().setOpenSection('style', 'typo');
    render(<StyleTab selection={selection} />);

    fireEvent.change(screen.getByLabelText('Tamanho da fonte'), {
      target: { value: '2' },
    });

    const html = state().deck.slides[0]?.html ?? '';
    expect(html).toContain('font-size: 2rem;');
  });

  it('aplica negrito, itálico, sublinhado, família e espaçamentos', () => {
    useUIStore.getState().setOpenSection('style', 'typo');
    render(<StyleTab selection={selection} />);

    fireEvent.click(screen.getByRole('button', { name: 'Negrito' }));
    fireEvent.click(screen.getByRole('button', { name: 'Itálico' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sublinhado' }));
    fireEvent.change(screen.getByLabelText('Família da fonte'), {
      target: { value: "Georgia, 'Times New Roman', serif" },
    });
    fireEvent.change(screen.getByLabelText('Espaço entre linhas'), {
      target: { value: '1.4' },
    });
    fireEvent.change(screen.getByLabelText('Espaço entre letras'), {
      target: { value: '0.05' },
    });

    const html = state().deck.slides[0]?.html ?? '';
    expect(html).toContain('font-weight: 700;');
    expect(html).toContain('font-style: italic;');
    expect(html).toContain('text-decoration: underline;');
    expect(html).toMatch(/font-family: Georgia, (?:'|&quot;)Times New Roman(?:'|&quot;), serif;/);
    expect(html).toContain('line-height: 1.4;');
    expect(html).toContain('letter-spacing: 0.05em;');
  });
});
