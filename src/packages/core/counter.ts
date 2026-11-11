/**
 * Contador animado: um elemento com `data-count` conta de 0 até o número
 * quando o slide entra (o runtime do template lê `data-count`/`data-decimals`).
 */

export interface ParsedNumber {
  value: number;
  decimals: number;
}

/** Lê números no formato brasileiro (`6.174`, `91,2`) ou simples (`42`, `3.5`). */
export function parseCounterText(text: string): ParsedNumber | null {
  const s = text.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    const [int = '', frac] = s.replace(/\./g, '').split(',');
    return { value: parseFloat(frac ? `${int}.${frac}` : int), decimals: frac ? frac.length : 0 };
  }
  if (/^\d+,\d+$/.test(s)) {
    return { value: parseFloat(s.replace(',', '.')), decimals: (s.split(',')[1] ?? '').length };
  }
  if (/^\d+\.\d+$/.test(s)) {
    return { value: parseFloat(s), decimals: (s.split('.')[1] ?? '').length };
  }
  if (/^\d+$/.test(s)) return { value: parseFloat(s), decimals: 0 };
  return null;
}

/** Primeiro nó de texto não vazio (o número exibido). */
function firstText(el: Element): string | null {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3 && (node.nodeValue ?? '').trim() !== '') return node.nodeValue ?? '';
  }
  return null;
}

/** O elemento (ou o único descendente com `data-count`) que pode contar. */
export function counterTarget(el: Element): Element | null {
  if (el.hasAttribute('data-count')) return el;
  const nested = el.querySelectorAll('[data-count]');
  if (nested.length === 1) return nested[0] ?? null;
  const text = firstText(el);
  return text !== null && parseCounterText(text) ? el : null;
}

/** Liga/desliga a contagem. Retorna `false` se o texto não for um número. */
export function setCounter(el: Element, on: boolean): boolean {
  if (!on) {
    el.removeAttribute('data-count');
    el.removeAttribute('data-decimals');
    return true;
  }
  const text = firstText(el);
  const parsed = text === null ? null : parseCounterText(text);
  if (!parsed) return false;
  el.setAttribute('data-count', String(parsed.value));
  if (parsed.decimals) el.setAttribute('data-decimals', String(parsed.decimals));
  else el.removeAttribute('data-decimals');
  return true;
}
