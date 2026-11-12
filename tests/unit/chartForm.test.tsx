import { FormGenerator } from '@components/Inspector/forms/FormGenerator';
import { chartDefaults } from '@packages/chart/ChartPackage';
import { chartForm } from '@packages/chart/formSchema';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUIStore } from '../../src/stores/uiStore';

function Harness({ initial }: { initial: Record<string, unknown> }) {
  const [spec, setSpec] = useState(initial);
  return (
    <FormGenerator
      schema={chartForm.filter((group) => (group.workspace ?? 'style') === 'style')}
      spec={spec}
      onChange={setSpec}
    />
  );
}

describe('formulário do gráfico', () => {
  // O acordeão é guardado no store: cada teste começa com tudo fechado.
  beforeEach(() => useUIStore.setState({ openSections: {} }));

  it('o padrão é a paleta, e o formulário tem Prefixo antes do Sufixo', () => {
    expect(chartDefaults.colorMode).toBe('palette');
    render(<Harness initial={{ ...chartDefaults }} />);
    fireEvent.click(screen.getByRole('button', { name: /Aparência/ }));
    expect(screen.getByText('Prefixo')).toBeInTheDocument();
    expect(screen.getByText('Sufixo')).toBeInTheDocument();
    // No modo paleta não há cor única nem cor de destaque.
    expect(screen.queryByText('Cor de destaque')).not.toBeInTheDocument();
    expect(screen.getByText(/cor da paleta/i)).toBeInTheDocument();
  });

  it('troca os campos de cor conforme o modo de coloração', () => {
    render(<Harness initial={{ ...chartDefaults, colorMode: 'single' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Aparência/ }));

    expect(screen.getByText('Cor de destaque')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Por item' }));

    expect(screen.queryByText('Cor de destaque')).not.toBeInTheDocument();
    expect(screen.getByText(/cor de cada item/i)).toBeInTheDocument();
  });

  it('não mostra as opções de animação na aba de estilo', () => {
    render(<Harness initial={{ ...chartDefaults }} />);
    expect(screen.queryByRole('button', { name: /Animação/ })).not.toBeInTheDocument();
  });
});
