import { FormGenerator } from '@components/Inspector/forms/FormGenerator';
import type { FormSchema } from '@packages/core/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const codeSchema: FormSchema = [
  { group: 'Conteúdo', fields: [{ k: 'code', label: 'Código', type: 'code', rows: 12 }] },
];

function renderCodeField(spec: Record<string, unknown>) {
  const onChange = vi.fn();
  render(<FormGenerator schema={codeSchema} spec={spec} onChange={onChange} />);
  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
  return { onChange, textarea };
}

describe('FormGenerator — campo code', () => {
  it('renderiza textarea monoespaçada multilinha com as rows do schema', () => {
    const { textarea } = renderCodeField({ code: 'linha um\nlinha dois' });
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.value).toBe('linha um\nlinha dois');
    expect(textarea.rows).toBe(12);
    expect(textarea.className).toContain('font-mono');
    expect(textarea.getAttribute('spellcheck')).toBe('false');
  });

  it('usa 4 rows por padrão quando o schema não declara rows (contrato do monólito)', () => {
    const schema: FormSchema = [
      { group: 'G', fields: [{ k: 'code', label: 'Código', type: 'code' }] },
    ];
    render(<FormGenerator schema={schema} spec={{ code: '' }} onChange={() => undefined} />);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).rows).toBe(4);
  });

  it('Tab insere quatro espaços na posição do cursor e mantém o foco', () => {
    const { onChange, textarea } = renderCodeField({ code: 'ab' });
    textarea.focus();
    textarea.setSelectionRange(2, 2);
    fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(textarea.value).toBe('ab    ');
    expect(onChange).toHaveBeenCalledWith({ code: 'ab    ' });
    expect(document.activeElement).toBe(textarea);
  });

  it('edita e propaga valores multilinha', () => {
    const { onChange, textarea } = renderCodeField({ code: '' });
    fireEvent.change(textarea, { target: { value: 'a\nb' } });
    expect(onChange).toHaveBeenCalledWith({ code: 'a\nb' });
  });
});
