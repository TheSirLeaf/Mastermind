import type { RuntimeAPI } from '../core/types';

import type { CodeSpec } from './CodeRenderer';

/**
 * Digitação do código.
 *
 * Ao montar o slide, cada caractere vira um `<span class="pk-h">` escondido
 * (`visibility:hidden`): o bloco aparece vazio, mas ocupa o tamanho final e nada
 * é reescrito — o realce de sintaxe continua intacto. A cada quadro revelamos os
 * caracteres cujo instante já passou e movemos o cursor.
 *
 * Este arquivo é serializado via String() no export: tudo precisa ficar dentro
 * da função (sem helpers de módulo).
 */
export function codeRuntime(root: HTMLElement, spec: CodeSpec, api: RuntimeAPI) {
  const pre = root.querySelector('pre.pk-pre');
  if (!pre) return null;
  const original = pre.innerHTML;
  const final = () => {
    pre.innerHTML = original;
  };

  if (!spec.typing || api.reduced) return { play: () => undefined, final };

  const lines = Array.from(pre.querySelectorAll('.pk-ln')) as HTMLElement[];
  const chars: { el: HTMLElement; line: number; ch: string }[] = [];
  const times: number[] = [];
  let caret: HTMLElement | null = null;
  let last = -1;
  let current: HTMLElement | null = null;

  // 1) Esconde todos os caracteres já na montagem, antes do atraso inicial.
  lines.forEach((ln, lineIndex) => {
    const walker = document.createTreeWalker(ln, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      nodes.push(node as Text);
      node = walker.nextNode();
    }
    nodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment();
      Array.from(textNode.nodeValue ?? '').forEach((ch) => {
        const span = document.createElement('span');
        span.className = 'pk-h';
        span.textContent = ch;
        fragment.appendChild(span);
        chars.push({ el: span, line: lineIndex, ch });
      });
      textNode.parentNode?.replaceChild(fragment, textNode);
    });
  });

  // 2) Instante de cada caractere: ritmo humano (variação pseudoaleatória fixa),
  //    pausa maior ao mudar de linha e indentação instantânea.
  const base = 1000 / Math.max(5, spec.cps || 48);
  let t = 0;
  let seed = 11;
  let previousLine = 0;
  let leading = true;
  chars.forEach((c) => {
    if (c.line !== previousLine) {
      t += base * 3.2;
      previousLine = c.line;
      leading = true;
    }
    if (leading && /\s/.test(c.ch)) {
      times.push(t);
      return;
    }
    leading = false;
    seed = (seed * 9301 + 49297) % 233280;
    t += base * (0.55 + (0.9 * seed) / 233280);
    times.push(t);
  });

  const moveCaret = (index: number) => {
    if (spec.caret === false) return;
    if (!caret) {
      caret = document.createElement('span');
      caret.className = 'pk-caret';
    }
    const next = chars[index + 1];
    if (next) next.el.parentNode?.insertBefore(caret, next.el);
    else chars[index]?.el.parentNode?.appendChild(caret);
  };

  return {
    play: () => {
      let start: number | null = null;
      const delay = spec.delay === undefined || spec.delay === null ? 900 : spec.delay;
      api.frame((ts: number) => {
        if (start === null) start = ts;
        const elapsed = ts - start - delay;
        if (elapsed < 0) return true;
        let n = last;
        while (n + 1 < chars.length && (times[n + 1] ?? 0) <= elapsed) {
          n += 1;
          const item = chars[n];
          if (item) item.el.className = '';
        }
        if (n !== last) {
          last = n;
          if (n >= 0) {
            moveCaret(n);
            if (spec.lineGlow !== false) {
              const line = lines[chars[n]?.line ?? 0] ?? null;
              if (line !== current) {
                current?.classList.remove('pk-cur');
                line?.classList.add('pk-cur');
                current = line;
              }
            }
          }
        }
        if (last >= chars.length - 1) {
          void api.wait(450).then(() => {
            if (!api.alive()) return;
            caret?.remove();
            current?.classList.remove('pk-cur');
          });
          return false;
        }
        return true;
      });
    },
    final,
  };
}
