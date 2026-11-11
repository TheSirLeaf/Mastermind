import { describe, expect, it } from 'vitest';

import { counterTarget, parseCounterText, setCounter } from '../../src/packages/core/counter';

function el(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as Element;
}

describe('parseCounterText', () => {
  it('lê inteiros, decimais e o formato brasileiro', () => {
    expect(parseCounterText('42')).toEqual({ value: 42, decimals: 0 });
    expect(parseCounterText('91,2')).toEqual({ value: 91.2, decimals: 1 });
    expect(parseCounterText('3.5')).toEqual({ value: 3.5, decimals: 1 });
    expect(parseCounterText('6.174')).toEqual({ value: 6174, decimals: 0 });
    expect(parseCounterText('1.234.567,89')).toEqual({ value: 1234567.89, decimals: 2 });
  });

  it('rejeita texto que não é número', () => {
    expect(parseCounterText('abc')).toBeNull();
    expect(parseCounterText('12%')).toBeNull();
    expect(parseCounterText('')).toBeNull();
  });
});

describe('setCounter', () => {
  it('liga e desliga data-count / data-decimals', () => {
    const node = el('<span>91,2</span>');
    expect(setCounter(node, true)).toBe(true);
    expect(node.getAttribute('data-count')).toBe('91.2');
    expect(node.getAttribute('data-decimals')).toBe('1');

    expect(setCounter(node, false)).toBe(true);
    expect(node.hasAttribute('data-count')).toBe(false);
    expect(node.hasAttribute('data-decimals')).toBe(false);
  });

  it('não liga quando o texto não é número', () => {
    const node = el('<span>olá</span>');
    expect(setCounter(node, true)).toBe(false);
    expect(node.hasAttribute('data-count')).toBe(false);
  });

  it('remove data-decimals antigo ao ligar um inteiro', () => {
    const node = el('<span data-decimals="2">7</span>');
    setCounter(node, true);
    expect(node.getAttribute('data-count')).toBe('7');
    expect(node.hasAttribute('data-decimals')).toBe(false);
  });
});

describe('counterTarget', () => {
  it('acha o próprio elemento ou o único descendente com data-count', () => {
    expect(counterTarget(el('<b data-count="3">3</b>'))?.tagName).toBe('B');
    expect(counterTarget(el('<div><b data-count="3">3</b></div>'))?.tagName).toBe('B');
  });

  it('só aceita elementos com texto numérico', () => {
    expect(counterTarget(el('<p>texto</p>'))).toBeNull();
    expect(counterTarget(el('<p>10</p>'))?.tagName).toBe('P');
  });
});
