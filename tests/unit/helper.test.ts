import { describe, expect, it } from 'vitest';

import { esc, fmt, hl, num, range } from '../../src/packages/core/helper';

describe('HelperAPI', () => {
  it('escapa HTML', () => {
    expect(esc('<b>"x" & y</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  });

  it('interpreta números pt-BR', () => {
    expect(num('90,0')).toBe(90);
    expect(num('1.234,5')).toBe(1234.5);
    expect(num('12.5')).toBe(12.5);
    expect(num('abc')).toBe(0);
    expect(num(7)).toBe(7);
    expect(num(null)).toBe(0);
  });

  it('formata em pt-BR', () => {
    expect(fmt(1234.5, 1)).toBe('1.234,5');
    expect(fmt(90, 0)).toBe('90');
  });

  it('expande intervalos de linhas', () => {
    expect(range('2, 4-6')).toEqual({ 2: true, 4: true, 5: true, 6: true });
    expect(range('')).toEqual({});
  });

  it('realça sem vazar HTML', () => {
    const lines = hl('const x = "<b>";', 'js');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('tk-kw');
    expect(lines[0]).toContain('&lt;b&gt;');
    expect(lines[0]).not.toContain('<b>');
  });

  it('mantém linhas vazias', () => {
    expect(hl('a\n\nb', 'text')).toHaveLength(3);
  });
});
