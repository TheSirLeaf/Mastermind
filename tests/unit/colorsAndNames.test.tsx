import { ColorField } from '@components/common/ColorField';
import { normalizeHex, readRecentColors, rememberColor } from '@components/common/colorUtils';
import { RenameLabel } from '@components/common/RenameLabel';
import { chartDefaults } from '@packages/chart/ChartPackage';
import { ChartRenderer } from '@packages/chart/ChartRenderer';
import { chartTimeline } from '@packages/chart/chartTimeline';
import { H } from '@packages/core/helper';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '../../src/stores/uiStore';

describe('seletor de cor', () => {
  beforeEach(() => localStorage.clear());

  it('normaliza hex de 3 e 6 dígitos, com ou sem #, e rgb()', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('f7d98b')).toBe('#F7D98B');
    expect(normalizeHex(' #F7D98B ')).toBe('#F7D98B');
    expect(normalizeHex('rgb(247, 217, 139)')).toBe('#F7D98B');
    expect(normalizeHex('azul')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
  });

  it('guarda as cores recentes sem repetir', () => {
    rememberColor('#111111');
    rememberColor('#222222');
    rememberColor('111111');
    expect(readRecentColors()).toEqual(['#111111', '#222222']);
  });

  function Harness() {
    const [value, setValue] = useState('#000000');
    return (
      <>
        <ColorField value={value} onChange={setValue} ariaLabel="Cor" />
        <output data-testid="out">{value}</output>
      </>
    );
  }

  it('aceita colar o hex e aplica a cor', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Cor (hex)');
    fireEvent.paste(input, { clipboardData: { getData: () => 'f7d98b' } });
    expect(screen.getByTestId('out').textContent).toBe('#F7D98B');
  });

  it('digitar um hex válido muda a cor; sair do campo completa o de 3 dígitos', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Cor (hex)');
    fireEvent.change(input, { target: { value: '#123456' } });
    expect(screen.getByTestId('out').textContent).toBe('#123456');
    fireEvent.change(input, { target: { value: '#fa0' } });
    expect(screen.getByTestId('out').textContent).toBe('#123456');
    fireEvent.blur(input);
    expect(screen.getByTestId('out').textContent).toBe('#FFAA00');
  });

  it('o seletor mostra as cores do slide e uma cor clicada é aplicada', () => {
    useUIStore.setState({ slidePalette: ['#151014', '#E5AAB6'] });
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Cor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cor #E5AAB6' }));
    expect(screen.getByTestId('out').textContent).toBe('#E5AAB6');
    expect(screen.getByText('Cores do slide')).toBeInTheDocument();
  });
});

describe('nome do elemento', () => {
  it('duplo clique renomeia; Enter confirma; vazio volta ao automático', () => {
    const onCommit = vi.fn();
    render(<RenameLabel value="Caixa de código" onCommit={onCommit} />);
    fireEvent.doubleClick(screen.getByText('Caixa de código'));
    const input = screen.getByLabelText('Nome do elemento');
    fireEvent.change(input, { target: { value: 'Bloco A' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('Bloco A');

    fireEvent.doubleClick(screen.getByText('Caixa de código'));
    const again = screen.getByLabelText('Nome do elemento');
    fireEvent.change(again, { target: { value: '' } });
    fireEvent.keyDown(again, { key: 'Enter' });
    expect(onCommit).toHaveBeenLastCalledWith('');
  });

  it('Esc cancela', () => {
    const onCommit = vi.fn();
    render(<RenameLabel value="X" onCommit={onCommit} />);
    fireEvent.doubleClick(screen.getByText('X'));
    const input = screen.getByLabelText('Nome do elemento');
    fireEvent.change(input, { target: { value: 'Y' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('gráfico: prefixo e linha do tempo', () => {
  it('mostra o prefixo antes do valor e o sufixo depois', () => {
    const { container } = render(
      <ChartRenderer
        h={H}
        spec={{
          ...chartDefaults,
          kind: 'hbar',
          prefix: 'R$ ',
          suffix: '%',
          rows: [{ label: 'a', val: '5' }],
        }}
      />
    );
    expect(container.querySelector('.pk-hv')?.textContent).toBe('R$ 5%');
  });

  it('a entrada aparece na linha do tempo e pode ser movida e redimensionada', () => {
    const spec = { ...chartDefaults, delay: 0.5, animDuration: 0.8, stagger: 0.1 };
    const [entry] = chartTimeline.events(spec);
    expect(entry?.id).toBe('entry');
    expect(entry?.start).toBe(0.5);
    expect(entry?.duration).toBeCloseTo(0.8 + 0.1 * (spec.rows.length - 1), 5);
    expect(chartTimeline.move(spec, 'entry', { start: 1.3 })).toEqual({ delay: 1.3 });
    const resized = chartTimeline.move(spec, 'entry', { duration: 2 }) as { animDuration: number };
    expect(resized.animDuration).toBeCloseTo(2 - 0.1 * (spec.rows.length - 1), 1);
    expect(chartTimeline.events({ ...spec, animate: false })).toEqual([]);
  });
});

describe('voltar à aba anterior ao sair da apresentação', () => {
  it('entra pela aba Apresentação e volta para a que estava', () => {
    useUIStore.getState().setWorkspace('animation');
    useUIStore.getState().setWorkspace('presentation');
    expect(useUIStore.getState().isPresenting).toBe(true);
    useUIStore.getState().setPresenting(false);
    expect(useUIStore.getState().workspace).toBe('animation');
  });

  it('da aba Slides volta para Slides', () => {
    useUIStore.getState().setWorkspace('slide');
    useUIStore.getState().setWorkspace('presentation');
    useUIStore.getState().setPresenting(false);
    expect(useUIStore.getState().workspace).toBe('slide');
    expect(useUIStore.getState().inspectorActiveTab).toBe('slide');
  });
});
