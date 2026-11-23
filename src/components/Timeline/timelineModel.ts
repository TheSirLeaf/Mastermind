// components/Timeline/timelineModel.ts
// Dados da linha do tempo: lê do HTML do slide as faixas (animações, pacotes, keyframes, brilho)
// e os utilitários de tempo usados pelo componente.
import { readAnimation, type AnimationKind, type ElementAnimation } from '@packages/core/animation';
import { readKeyframes, type Keyframe } from '@packages/core/keyframes';
import { registry } from '@packages/core/PackageRegistry';
import type { PackageDef, PackageTimelineEvent } from '@packages/core/types';

import { parseShine, type TextShine } from '../../editor/textFx';
import { getElementSpec } from '../Inspector/packageSpec';

export interface Track {
  path: number[];
  key: string;
  label: string;
  depth: number;
  animation: ElementAnimation | null;
}

/** Pacote com eventos próprios (digitação, destaques…) na linha do tempo. */
export interface PackageTrack {
  path: number[];
  key: string;
  label: string;
  def: PackageDef;
  spec: Record<string, unknown>;
}

/** Tudo o que um mesmo elemento tem na linha do tempo. */
export interface ElementGroup {
  key: string;
  path: number[];
  label: string;
  anim?: Track;
  pkg?: PackageTrack;
  kf?: KeyframeTrack;
  shine?: ShineTrack;
}

/** Brilho que passa pelo texto (animação contínua do elemento). */
export interface ShineTrack {
  path: number[];
  key: string;
  label: string;
  shine: TextShine;
}

export interface ShineDrag {
  track: ShineTrack;
  mode: 'move' | 'resize';
  startX: number;
}

export function comparePaths(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? -1) - (b[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Interpolação (keyframes) de um elemento. */
export interface KeyframeTrack {
  path: number[];
  key: string;
  label: string;
  kfs: Keyframe[];
}

export interface KeyframeDrag {
  track: KeyframeTrack;
  index: number;
  startX: number;
  /** Passou do limite de clique: é um arrasto (muda o tempo), não uma seleção. */
  moved: boolean;
}

export type Scope = 'slide' | 'selection';

export const KIND_COLORS: Record<AnimationKind, string> = {
  rise: '#F7D98B',
  fade: '#9CC5E8',
  slide: '#8FD3A8',
  zoom: '#E8A0B4',
  blur: '#B9A6E8',
  flip: '#F0B27A',
};

export const KIND_LABELS: Record<AnimationKind, string> = {
  rise: 'Subir',
  fade: 'Fade',
  slide: 'Deslizar',
  zoom: 'Zoom',
  blur: 'Desfoque',
  flip: 'Flip',
};

/** Parte do intervalo em que a faixa de luz está passando (o resto é espera). */
export const SHINE_SWEEP = 0.6;
export const SHINE_COLOR = '#F3E9C6';

export const TEXT_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'span',
  'b',
  'i',
  'em',
  'strong',
  'li',
]);
export const SNAP = 0.05;

export function labelOf(element: Element): string {
  const custom = element.getAttribute('data-name')?.trim();
  if (custom) return custom;
  const tag = element.tagName.toLowerCase();
  const pkg = element.getAttribute('data-pkg');
  if (pkg) return registry.get(pkg)?.name ?? `Pacote · ${pkg}`;
  if (TEXT_TAGS.has(tag)) {
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 26);
    if (text) return `${tag} — ${text}`;
  }
  const cls = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)[0];
  return cls ? `${tag}.${cls}` : tag;
}

export function collectTracks(html: string, slideIndex: number): Track[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [];
  const out: Track[] = [];
  const walk = (element: Element, path: number[], depth: number): void => {
    Array.from(element.children).forEach((child, index) => {
      if (child.id === 'mm-sel') return;
      const childPath = [...path, index];
      const animation = readAnimation(child);
      if (animation) {
        out.push({
          path: childPath,
          key: childPath.join('.'),
          label: labelOf(child),
          depth,
          animation,
        });
      }
      walk(child, childPath, animation ? depth + 1 : depth);
    });
  };
  walk(root, [slideIndex], 0);
  return out;
}

export function collectPackageTracks(html: string, slideIndex: number): PackageTrack[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [];
  const out: PackageTrack[] = [];
  const walk = (element: Element, path: number[]): void => {
    Array.from(element.children).forEach((child, index) => {
      if (child.id === 'mm-sel') return;
      const childPath = [...path, index];
      const id = child.getAttribute('data-pkg');
      const def = id ? registry.get(id) : undefined;
      if (def?.timeline) {
        out.push({
          path: childPath,
          key: childPath.join('.'),
          label: labelOf(child),
          def,
          spec: getElementSpec(child),
        });
      }
      walk(child, childPath);
    });
  };
  walk(root, [slideIndex]);
  return out;
}

export function collectShineTracks(html: string, slideIndex: number): ShineTrack[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [];
  const out: ShineTrack[] = [];
  const walk = (element: Element, path: number[]): void => {
    Array.from(element.children).forEach((child, index) => {
      if (child.id === 'mm-sel') return;
      const childPath = [...path, index];
      const shine = parseShine(child.getAttribute('data-shine'));
      if (shine) {
        out.push({ path: childPath, key: childPath.join('.'), label: labelOf(child), shine });
      }
      walk(child, childPath);
    });
  };
  walk(root, [slideIndex]);
  return out;
}

export function collectKeyframeTracks(html: string, slideIndex: number): KeyframeTrack[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [];
  const out: KeyframeTrack[] = [];
  const walk = (element: Element, path: number[]): void => {
    Array.from(element.children).forEach((child, index) => {
      if (child.id === 'mm-sel') return;
      const childPath = [...path, index];
      const kfs = readKeyframes(child);
      if (kfs.length > 0) {
        out.push({ path: childPath, key: childPath.join('.'), label: labelOf(child), kfs });
      }
      walk(child, childPath);
    });
  };
  walk(root, [slideIndex]);
  return out;
}

export function packageEvents(
  track: PackageTrack,
  spec: Record<string, unknown>
): PackageTimelineEvent[] {
  try {
    return track.def.timeline?.events(spec) ?? [];
  } catch {
    return [];
  }
}

export function elementAt(html: string, path: number[]): Element | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let node: Element | null = doc.body.firstElementChild;
  for (const part of path.slice(1)) {
    node = node?.children[part] ?? null;
    if (!node) return null;
  }
  return node;
}

export const round = (value: number): number => Math.round(value / SNAP) * SNAP;
export const fmt = (seconds: number): string => `${seconds.toFixed(2).replace(/\.?0+$/, '')}s`;

export interface PackageDrag {
  track: PackageTrack;
  event: PackageTimelineEvent;
  mode: 'move' | 'resize';
  startX: number;
}

export interface DragState {
  key: string;
  mode: 'move' | 'resize';
  startX: number;
  base: ElementAnimation;
  path: number[];
}

/** Resumo da formatação de texto do keyframe (para a dica da linha do tempo). */
export function keyframeTextSummary(k: Keyframe): string {
  const parts: string[] = [];
  if (k.c) parts.push(`cor ${k.c}`);
  if (k.fs !== undefined) parts.push(`${k.fs}px`);
  if (k.w !== undefined) parts.push(`peso ${k.w}`);
  if (k.ls !== undefined) parts.push(`letras ${k.ls}em`);
  if (k.g !== undefined) parts.push(`neon ${k.g}px`);
  if (k.bl !== undefined) parts.push(`desfoque ${k.bl}px`);
  return parts.length ? ` · texto: ${parts.join(', ')}` : '';
}
