// Linha do tempo do pacote de código: digitação + eventos de destaque de linha.
import type { PackageTimeline, PackageTimelineEvent } from '../core/types';

import type { CodeHighlight, CodeSpec } from './CodeRenderer';

/** Eventos de destaque; `hl` (campo antigo) vira um evento logo depois de digitar. */
export function codeHighlights(spec: CodeSpec): CodeHighlight[] {
  const list: CodeHighlight[] = Array.isArray(spec.highlights)
    ? spec.highlights
    : spec.hl
      ? [{ lines: spec.hl, at: 0 }]
      : [];
  return list
    .map((e) => ({
      lines: String(e.lines ?? ''),
      at: Math.max(0, Number(e.at) || 0),
      keep: !!e.keep,
    }))
    .sort((a, b) => a.at - b.at);
}

/** Linhas ("2, 4-6") → mapa `{2:true, 4:true, 5:true, 6:true}`. */
export function parseLines(text: string): Record<number, true> {
  const out: Record<number, true> = {};
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
}

/** Linhas destacadas no estado final (depois de todos os eventos). */
export function finalHighlighted(spec: CodeSpec): Record<number, true> {
  let current: Record<number, true> = {};
  for (const event of codeHighlights(spec)) {
    const set = parseLines(event.lines);
    current = event.keep ? { ...current, ...set } : set;
  }
  return current;
}

/**
 * Duração da digitação em segundos. Repete o ritmo do runtime (mesma sequência
 * pseudoaleatória) para a linha do tempo mostrar o tempo real.
 */
export function typingSeconds(spec: CodeSpec): number {
  if (!spec.typing) return 0;
  const lines = String(spec.code ?? '').split('\n');
  const base = 1000 / Math.max(5, spec.cps || 48);
  if (spec.variant === 'terminal') return ((lines.length - 1) * base * 9) / 1000;
  let t = 0;
  let seed = 11;
  lines.forEach((line, index) => {
    if (index > 0) t += base * 3.2;
    let leading = true;
    for (const ch of Array.from(line || ' ')) {
      if (leading && /\s/.test(ch)) continue;
      leading = false;
      seed = (seed * 9301 + 49297) % 233280;
      t += base * (0.55 + (0.9 * seed) / 233280);
    }
  });
  return t / 1000;
}

const round = (value: number, step: number): number => Math.round(value / step) * step;

function delaySeconds(spec: CodeSpec): number {
  return (spec.delay === undefined || spec.delay === null ? 900 : spec.delay) / 1000;
}

/** Quando a digitação termina (início dos destaques), em segundos. */
export function typingEnd(spec: CodeSpec): number {
  return delaySeconds(spec) + typingSeconds(spec);
}

/** Duração total da animação do bloco, em ms (digitação + destaques). */
export function codeTotalMs(spec: CodeSpec): number {
  const events = codeHighlights(spec);
  const last = events.length ? (events[events.length - 1]?.at ?? 0) : 0;
  const animated = spec.typing || events.length > 0;
  if (!animated) return 0;
  return Math.round((typingEnd(spec) + last) * 1000) + 1200;
}

export const codeTimeline: PackageTimeline<CodeSpec> = {
  events(spec): PackageTimelineEvent[] {
    const out: PackageTimelineEvent[] = [];
    const end = typingEnd(spec);
    if (spec.typing) {
      out.push({
        id: 'typing',
        label: spec.variant === 'terminal' ? 'Console' : 'Digitação',
        start: delaySeconds(spec),
        duration: Math.max(0.1, typingSeconds(spec)),
        color: '#F7D98B',
        resizable: true,
      });
    }
    const highlights = codeHighlights(spec);
    highlights.forEach((event, index) => {
      const start = end + event.at;
      const next = highlights[index + 1];
      out.push({
        id: `hl-${index}`,
        label: `Linha ${event.lines || '?'}`,
        start,
        duration: next ? Math.max(0.2, end + next.at - start) : 1.5,
        color: '#9CC5E8',
      });
    });
    return out;
  },

  move(spec, id, change) {
    if (id === 'typing') {
      if (change.duration !== undefined) {
        const current = Math.max(0.1, typingSeconds(spec));
        const cps = Math.max(5, spec.cps || 48);
        const next = Math.min(
          160,
          Math.max(8, Math.round((cps * current) / Math.max(0.1, change.duration)))
        );
        return { cps: next };
      }
      if (change.start !== undefined) return { delay: Math.max(0, round(change.start * 1000, 50)) };
      return null;
    }
    const match = /^hl-(\d+)$/.exec(id);
    if (!match || change.start === undefined) return null;
    const list = codeHighlights(spec);
    const index = Number(match[1]);
    if (!list[index]) return null;
    const at = Math.max(0, round(change.start - typingEnd(spec), 0.1));
    return { highlights: list.map((e, i) => (i === index ? { ...e, at } : e)) };
  },
};
