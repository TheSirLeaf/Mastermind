import type { RuntimeAPI } from '../core/types';

import type { CodeSpec } from './CodeRenderer';

/**
 * Animação do bloco de código: digitação e eventos de destaque de linha.
 *
 * Ao montar o slide, cada caractere vira um `<span class="pk-h">` escondido
 * (`visibility:hidden`): o bloco aparece vazio, mas ocupa o tamanho final e nada
 * é reescrito — o realce de sintaxe continua intacto. As linhas começam sem
 * destaque; depois da digitação cada evento de destaque entra no seu momento.
 * O cursor continua piscando no fim do código.
 *
 * Este arquivo é serializado via String() no export: tudo precisa ficar dentro
 * da função (sem helpers de módulo) e repete o ritmo de `codeTimeline.ts`.
 */
export function codeRuntime(root: HTMLElement, spec: CodeSpec, api: RuntimeAPI) {
  const pre = root.querySelector('pre.pk-pre');
  if (!pre) return null;
  const original = pre.innerHTML;
  const final = () => {
    pre.innerHTML = original;
  };

  const lines = Array.from(pre.querySelectorAll('.pk-ln')) as HTMLElement[];

  // Eventos de destaque (o campo antigo `hl` vira um evento logo depois de digitar).
  const parse = (text: string) => {
    const out: Record<number, boolean> = {};
    String(text || '')
      .split(',')
      .forEach((part) => {
        const m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(part);
        if (!m) return;
        const a = Number(m[1]);
        const b = m[2] ? Number(m[2]) : a;
        for (let i = a; i <= Math.min(b, a + 2000); i += 1) out[i] = true;
      });
    return out;
  };
  const source = Array.isArray(spec.highlights)
    ? spec.highlights
    : spec.hl
      ? [{ lines: spec.hl, at: 0, keep: false }]
      : [];
  const events = source
    .map((e) => ({
      set: parse(String(e.lines ?? '')),
      at: Math.max(0, Number(e.at) || 0) * 1000,
      keep: !!e.keep,
    }))
    .sort((a, b) => a.at - b.at);

  if (api.reduced || (!spec.typing && events.length === 0)) return { play: () => undefined, final };

  // Começa sem destaque nenhum: eles aparecem na hora marcada.
  lines.forEach((ln) => ln.classList.remove('pk-hl'));

  const chars: { el: HTMLElement; line: number; ch: string }[] = [];
  const times: number[] = [];
  let caret: HTMLElement | null = null;
  let last = -1;
  let current: HTMLElement | null = null;

  if (spec.typing) {
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
    const byLine = spec.variant === 'terminal';
    let t = 0;
    let seed = 11;
    let previousLine = 0;
    let leading = true;
    chars.forEach((c) => {
      // Console: a linha inteira aparece de uma vez, uma depois da outra.
      if (byLine) {
        times.push(c.line * base * 9);
        return;
      }
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
  }

  const typingMs = times.length ? (times[times.length - 1] ?? 0) : 0;

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

  const applyEvent = (event: { set: Record<number, boolean>; keep: boolean }) => {
    lines.forEach((ln, i) => {
      if (event.set[i + 1]) ln.classList.add('pk-hl');
      else if (!event.keep) ln.classList.remove('pk-hl');
    });
  };

  return {
    play: () => {
      let start: number | null = null;
      let nextEvent = 0;
      let glowCleared = false;
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
        const typed = !spec.typing || last >= chars.length - 1;
        if (typed && !glowCleared) {
          // O cursor continua piscando no fim do código; só o realce da linha digitada some.
          glowCleared = true;
          void api.wait(450).then(() => {
            if (!api.alive()) return;
            current?.classList.remove('pk-cur');
          });
        }
        // Destaques entram `at` ms depois do fim da digitação.
        while (nextEvent < events.length && typingMs + (events[nextEvent]?.at ?? 0) <= elapsed) {
          const event = events[nextEvent];
          nextEvent += 1;
          if (event) applyEvent(event);
        }
        return !(typed && nextEvent >= events.length);
      });
    },
    final,
  };
}
