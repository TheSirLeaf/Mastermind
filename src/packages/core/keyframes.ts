// packages/core/keyframes.ts
// Interpolação dentro do slide: um elemento percorre vários keyframes no tempo.
// Os valores são relativos ao estado natural do elemento (X/Y em px do slide, escala 1 = 100%,
// giro em graus, opacidade 0–1) e ficam no atributo `data-kf` (JSON). O host da apresentação
// (`pkgHost.ts`) os executa com a Web Animations API.
import type { ElementPatch } from './animation';

export interface Keyframe {
  /** Instante em segundos desde o início do slide. */
  t: number;
  x: number;
  y: number;
  /** Escala (1 = tamanho natural). */
  s: number;
  /** Giro em graus. */
  r: number;
  /** Opacidade de 0 a 1. */
  o: number;
  /** Curva até o próximo keyframe. */
  ease: string;
}

export const KEYFRAME_EASINGS: Array<[string, string]> = [
  ['ease-in-out', 'Suave'],
  ['linear', 'Linear'],
  ['ease-out', 'Saída rápida'],
  ['ease-in', 'Entrada lenta'],
  ['cubic-bezier(.2,1.3,.35,1)', 'Elástico'],
];

export const KEYFRAME_DEFAULT: Keyframe = {
  t: 1,
  x: 0,
  y: 0,
  s: 1,
  r: 0,
  o: 1,
  ease: 'ease-in-out',
};

const clamp = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export function normalizeKeyframe(input: Partial<Keyframe>): Keyframe {
  const ease = KEYFRAME_EASINGS.some(([value]) => value === input.ease)
    ? (input.ease as string)
    : KEYFRAME_DEFAULT.ease;
  return {
    t: Math.round(clamp(input.t, 1, 0, 120) * 100) / 100,
    x: Math.round(clamp(input.x, 0, -4000, 4000)),
    y: Math.round(clamp(input.y, 0, -4000, 4000)),
    s: Math.round(clamp(input.s, 1, 0.01, 20) * 100) / 100,
    r: Math.round(clamp(input.r, 0, -3600, 3600)),
    o: Math.round(clamp(input.o, 1, 0, 1) * 100) / 100,
    ease,
  };
}

/** Normaliza e ordena por tempo. */
export function normalizeKeyframes(list: Array<Partial<Keyframe>>): Keyframe[] {
  return list.map(normalizeKeyframe).sort((a, b) => a.t - b.t);
}

/** Keyframes gravados no elemento (`[]` quando não há). */
export function readKeyframes(el: Element): Keyframe[] {
  const raw = el.getAttribute('data-kf');
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeKeyframes(parsed as Array<Partial<Keyframe>>) : [];
  } catch {
    return [];
  }
}

/** Patch que grava (ou remove, se a lista for vazia) os keyframes no elemento. */
export function keyframesPatch(list: Keyframe[]): ElementPatch {
  if (list.length === 0) return { attrs: { 'data-kf': null } };
  return { attrs: { 'data-kf': JSON.stringify(normalizeKeyframes(list)) } };
}

/** Quando o último keyframe acontece, em segundos. */
export function keyframesEnd(list: Keyframe[]): number {
  return list.reduce((max, k) => Math.max(max, k.t), 0);
}
