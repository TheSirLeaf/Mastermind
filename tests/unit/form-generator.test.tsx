
import { FormGenerator } from '@components/Inspector/forms/FormGenerator';
import type { FormSchema } from '@packages/core/types';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

function makeSchema(): FormSchema {
  return [
    {
      group: 'Conteúdo',
      icon: 'code',
      open: true,
      fields: [
        { k: 'file', label: 'Nome do arquivo', type: 'text', placeholder: 'Controls/AgendaUC.cs' },
        {
          k: 'lang',
          label: 'Linguagem',
          type: 'select',
          options: [
            ['csharp', 'C#'],
            ['yaml', 'YAML'],
            ['json', 'JSON'],
          ],
        },
        {
          k: 'typing',
          label: 'Digitar o código',
          type: 'toggle',
        },
        {
          k: 'cps',
          label: 'Velocidade',
          type: 'range',
          min: 8,
          max: 160,
          step: 1,
          unit: ' cps',
          showIf: { k: 'typing', eq: true },
        },
      ],
    },
    {
      group: 'Itens',
      icon: 'list',
      open: true,
      fields: [
        {
          k: 'rows',
          type: 'list',
          addLabel: 'Adicionar item',
          item: [
            { k: 'label', type: 'text', placeholder: 'Rótulo', w: '1fr' },
            { k: 'val', type: 'text', placeholder: 'Valor', w: '64px' },
            { k: 'hl', type: 'check', title: 'Destacar', w: '24px' },
          ],
          itemDefault: { label: 'novo', val: '1', hl: false },
        },
      ],
    },
  ];
}

describe('FormGenerator - integração', () => {
  it('renderiza todos os campos do schema', () => {
    const onChange = vi.fn();
    render(
      <FormGenerator schema={makeSchema()} spec={{}} onChange={onChange} />,
    );

    expect(screen.getByPlaceholderText('Controls/AgendaUC.cs')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    // showIf: typing eq true, mas typing está false → campo deve estar escondido
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByText(/Adicionar item/)).toBeInTheDocument();
  });

  it('aplica valores iniciais do spec', () => {
    const onChange = vi.fn();
    render(
      <FormGenerator
        schema={makeSchema()}
        spec={{ file: 'MeuArquivo.cs', lang: 'yaml', typing: true }}
        onChange={onChange}
      />,
    );

    const fileInput = screen.getByPlaceholderText('Controls/AgendaUC.cs') as HTMLInputElement;
    expect(fileInput.value).toBe('MeuArquivo.cs');

    const langSelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(langSelect.value).toBe('yaml');

    const typingToggle = screen.getByRole('switch');
    expect(typingToggle.getAttribute('aria-checked')).toBe('true');
  });

  it('dispara onChange ao alterar campo de texto', () => {
    const onChange = vi.fn();
    render(
      <FormGenerator schema={makeSchema()} spec={{}} onChange={onChange} />,
    );

    const fileInput = screen.getByPlaceholderText('Controls/AgendaUC.cs') as HTMLInputElement;
    fireEvent.input(fileInput, { target: { value: 'novo.cs' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ file: 'novo.cs' }),
    );
  });

  it('dispara onChange ao alterar select', () => {
    const onChange = vi.fn();
    render(
      <FormGenerator schema={makeSchema()} spec={{}} onChange={onChange} />,
    );

    const langSelect = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(langSelect, { target: { value: 'json' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'json' }),
    );
  });

  it('mostra campo condicional (showIf) quando toggle está ligado', () => {
    const onChange = vi.fn();
    render(
      <FormGenerator
        schema={makeSchema()}
        spec={{ typing: true }}
        onChange={onChange}
      />,
    );

    // O campo "Velocidade" só aparece quando typing === true
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('switch')!.getAttribute('aria-checked')).toBe('true');
  });

  it('esconde campo condicional (showIf) quando toggle está desligado', () => {
    const onChange = vi.fn();
    render(
      <FormGenerator schema={makeSchema()} spec={{}} onChange={onChange} />,
    );

    expect(screen.queryByLabelText(/Velocidade/)).not.toBeInTheDocument();
  });

  it('adiciona item à lista', () => {
    const onChange = vi.fn();
    render(
      <FormGenerator schema={makeSchema()} spec={{ rows: [] }} onChange={onChange} />,
    );

    const addButton = screen.getByText(/Adicionar item/);
    fireEvent.click(addButton);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({ label: 'novo', val: '1', hl: false }),
        ]),
      }),
    );
  });

  it('altera valor dentro de um item da lista', () => {
    const onChange = vi.fn();
    render(
      <FormGenerator
        schema={makeSchema()}
        spec={{ rows: [{ label: 'A', val: '1', hl: false }] }}
        onChange={onChange}
      />,
    );

    // O input de rótulo dentro do item da lista (placeholders são únicos por item)
    const textInputs = screen.getAllByPlaceholderText('Rótulo');
    fireEvent.input(textInputs[0]!, { target: { value: 'Modificado' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([
          expect.objectContaining({ label: 'Modificado', val: '1', hl: false }),
        ]),
      }),
    );
  });
});
