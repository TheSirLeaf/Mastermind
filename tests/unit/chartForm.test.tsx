import { FormGenerator } from '@components/Inspector/forms/FormGenerator';
import { chartDefaults } from '@packages/chart/ChartPackage';
import { chartForm } from '@packages/chart/formSchema';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

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
  it('troca os campos de cor conforme o modo de coloração', () => {
    render(<Harness initial={{ ...chartDefaults }} />);
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
