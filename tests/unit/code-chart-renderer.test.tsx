import { ChartRenderer, type ChartSpec } from '@packages/chart/ChartRenderer';
import { CodeRenderer, type CodeSpec } from '@packages/code/CodeRenderer';
import { H } from '@packages/core/helper';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('CodeRenderer', () => {
  const defaults: CodeSpec = {
    file: 'Controls/AgendaUC.cs',
    tag: 'C#',
    lang: 'csharp',
    code: 'await conexao.RunInTransactionAsync(tx =>\n{\n    tx.Insert(novo.Cadastro);\n});',
    theme: 'dark',
    fontSize: 24,
    lineHeight: 1.7,
    titlebar: true,
    note: '',
    hl: '',
    lineGlow: false,
    typing: false,
    cps: 48,
    delay: 0,
    caret: true,
    w: 900,
  };

  it('renderiza o container com classes corretas', () => {
    render(<CodeRenderer spec={defaults} h={H} />);
    const container = screen.getByTestId('pk-code-container');
    expect(container).toHaveClass('pk-code');
    expect(container).toHaveClass('pk-dark');
    expect(container).not.toHaveClass('pk-light');
  });

  it('renderiza a barra de título com file e tag', () => {
    render(<CodeRenderer spec={defaults} h={H} />);
    const bar = screen.getByTestId('pk-titlebar');
    expect(bar).toBeInTheDocument();
    expect(screen.getByText('Controls/AgendaUC.cs')).toBeInTheDocument();
    expect(screen.getByText('C#')).toBeInTheDocument();
  });

  it('oculta a barra de título quando titlebar é false', () => {
    render(<CodeRenderer spec={{ ...defaults, titlebar: false }} h={H} />);
    expect(screen.queryByTestId('pk-titlebar')).not.toBeInTheDocument();
  });

  it('renderiza o rodapé (note) quando fornecido', () => {
    render(<CodeRenderer spec={{ ...defaults, note: 'rodapé de teste' }} h={H} />);
    expect(screen.getByText('rodapé de teste')).toBeInTheDocument();
  });

  it('não renderiza o rodapé quando note está vazio', () => {
    render(<CodeRenderer spec={defaults} h={H} />);
    expect(screen.queryByTestId('pk-note')).not.toBeInTheDocument();
  });

  it('aplica tema claro quando theme é light', () => {
    render(<CodeRenderer spec={{ ...defaults, theme: 'light' }} h={H} />);
    const container = screen.getByTestId('pk-code-container');
    expect(container).toHaveClass('pk-light');
    expect(container).not.toHaveClass('pk-dark');
  });

  it('realça as linhas em destaque (hl)', () => {
    render(<CodeRenderer spec={{ ...defaults, hl: '1-2' }} h={H} />);
    const lines = screen.getAllByTestId(/^pk-code-line-\d+$/);
    expect(lines[0]).toHaveClass('pk-hl');
    expect(lines[1]).toHaveClass('pk-hl');
    expect(lines[2]).not.toHaveClass('pk-hl');
  });
});

describe('ChartRenderer', () => {
  const defaults: ChartSpec = {
    kind: 'bar',
    title: 'Barras de exemplo',
    rows: [
      { label: '11/10', val: '5', hl: false },
      { label: '12/10', val: '8', hl: true },
      { label: '14/10', val: '11', hl: false },
    ],
    color: '#C77C8A',
    hlColor: '#F7D98B',
    max: '',
    suffix: '',
    decimals: 0,
    showValues: true,
    grid: false,
    animate: false,
    countUp: false,
    delay: 0,
    w: 900,
  };

  it('renderiza o container com classes corretas', () => {
    render(<ChartRenderer spec={defaults} h={H} />);
    const container = screen.getByTestId('pk-chart-container');
    expect(container).toBeInTheDocument();
  });

  it('renderiza o título quando fornecido', () => {
    render(<ChartRenderer spec={defaults} h={H} />);
    expect(screen.getByText('Barras de exemplo')).toBeInTheDocument();
  });

  it('oculta o título quando vazio', () => {
    render(<ChartRenderer spec={{ ...defaults, title: '' }} h={H} />);
    expect(screen.queryByText('Barras de exemplo')).not.toBeInTheDocument();
  });

  it('renderiza barras horizontais quando kind é hbar', () => {
    render(<ChartRenderer spec={{ ...defaults, kind: 'hbar' }} h={H} />);
    const bars = screen.getAllByTestId(/^pk-hbar-\d+$/);
    expect(bars.length).toBe(3);
  });

  it('renderiza rosca (donut) quando kind é donut', () => {
    render(<ChartRenderer spec={{ ...defaults, kind: 'donut' }} h={H} />);
    expect(screen.getByTestId('pk-donut')).toBeInTheDocument();
  });

  it('renderiza linha quando kind é line', () => {
    render(<ChartRenderer spec={{ ...defaults, kind: 'line' }} h={H} />);
    expect(screen.getByTestId('pk-line')).toBeInTheDocument();
  });

  it('aplica cor de destaque (hlColor) na linha destacada', () => {
    render(<ChartRenderer spec={{ ...defaults, kind: 'donut' }} h={H} />);
    const highlighted = screen.getAllByTestId(/^pk-hl-\d+$/);
    expect(highlighted.length).toBeGreaterThan(0);
    // Pelo menos um círculo deve ter a cor de destaque
    const hlColorCircle = highlighted.find((el) => el.getAttribute('stroke') === '#F7D98B');
    expect(hlColorCircle).toBeDefined();
  });

  it('esconde valores quando showValues é false', () => {
    render(<ChartRenderer spec={{ ...defaults, showValues: false }} h={H} />);
    expect(screen.queryByTestId(/^pk-value-\d+$/)).not.toBeInTheDocument();
  });

  it('aplica sufixo nos valores quando definido', () => {
    render(<ChartRenderer spec={{ ...defaults, suffix: '%' }} h={H} />);
    expect(screen.getAllByText(/%$/).length).toBeGreaterThan(0);
  });
});
