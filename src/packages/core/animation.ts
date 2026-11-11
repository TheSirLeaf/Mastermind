/**
 * Contrato de animação de entrada dos elementos de slide.
 *
 * O editor grava os atributos no próprio HTML do slide, então o mesmo formato
 * funciona no iframe, no export autônomo e no undo — sem depender do editor.
 *
 * Compatibilidade: elementos com `class="anim"` e sem `data-anim` continuam
 * usando o `rise` legado do template.
 */

export const ANIMATION_KINDS = ['rise', 'fade', 'slide', 'zoom', 'blur', 'flip'] as const;
export type AnimationKind = (typeof ANIMATION_KINDS)[number];

export const ANIMATION_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
export type AnimationDirection = (typeof ANIMATION_DIRECTIONS)[number];

export interface ElementAnimation {
  kind: AnimationKind;
  direction: AnimationDirection;
  /** Atraso em segundos. */
  delay: number;
  /** Duração em segundos. */
  duration: number;
  /** Função CSS de timing, ex.: `cubic-bezier(.16,.84,.24,1)`. */
  easing: string;
  /** Deslocamento em px para `slide`. */
  distance: number;
}

export interface AnimationPreset {
  id: string;
  label: string;
  description: string;
  animation: ElementAnimation;
}

/** Valores usados quando o elemento já tem `.anim`, mas não tem `data-anim`. */
export const ANIMATION_DEFAULTS: ElementAnimation = {
  kind: 'rise',
  direction: 'up',
  delay: 0,
  duration: 0.85,
  easing: 'cubic-bezier(.16,.84,.24,1)',
  distance: 26,
};

export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'sutil',
    label: 'Sutil',
    description: 'Sobe 16 px e aparece em 0,6 s.',
    animation: {
      ...ANIMATION_DEFAULTS,
      kind: 'rise',
      duration: 0.6,
      distance: 16,
      easing: 'cubic-bezier(.22,.61,.36,1)',
    },
  },
  {
    id: 'rapido',
    label: 'Rápido',
    description: 'Fade curto para entradas discretas.',
    animation: {
      ...ANIMATION_DEFAULTS,
      kind: 'fade',
      duration: 0.35,
      easing: 'ease-out',
    },
  },
  {
    id: 'dramatico',
    label: 'Dramático',
    description: 'Zoom com desaceleração longa.',
    animation: {
      ...ANIMATION_DEFAULTS,
      kind: 'zoom',
      duration: 1.1,
      easing: 'cubic-bezier(.2,1.3,.35,1)',
    },
  },
  {
    id: 'lateral',
    label: 'Slide lateral',
    description: 'Entra pela esquerda com 42 px de deslocamento.',
    animation: {
      ...ANIMATION_DEFAULTS,
      kind: 'slide',
      direction: 'left',
      duration: 0.75,
      distance: 42,
    },
  },
  {
    id: 'desfoque',
    label: 'Desfoque',
    description: 'Surge desfocado e ganha nitidez.',
    animation: {
      ...ANIMATION_DEFAULTS,
      kind: 'blur',
      duration: 0.8,
      easing: 'ease-out',
    },
  },
];

const KIND_SET = new Set<string>(ANIMATION_KINDS);
const DIRECTION_SET = new Set<string>(ANIMATION_DIRECTIONS);

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

/** Lê um tempo CSS (`0.4s`, `400ms`, `400`) em segundos. */
export const parseTime = (value: string | null | undefined, fallback: number): number => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  const number = Number.parseFloat(normalized);
  if (!Number.isFinite(number)) return fallback;
  return normalized.endsWith('ms') ? number / 1000 : number;
};

/** Normaliza uma animação parcial vinda da UI ou de um preset. */
export function normalizeAnimation(input: Partial<ElementAnimation> = {}): ElementAnimation {
  const kind = KIND_SET.has(String(input.kind)) ? (input.kind as AnimationKind) : 'rise';
  const direction = DIRECTION_SET.has(String(input.direction))
    ? (input.direction as AnimationDirection)
    : 'up';
  return {
    kind,
    direction,
    delay: clampNumber(input.delay, ANIMATION_DEFAULTS.delay, 0, 10),
    duration: clampNumber(input.duration, ANIMATION_DEFAULTS.duration, 0.05, 5),
    easing: String(input.easing ?? ANIMATION_DEFAULTS.easing).trim() || ANIMATION_DEFAULTS.easing,
    distance: clampNumber(input.distance, ANIMATION_DEFAULTS.distance, 0, 400),
  };
}

/** `true` quando o elemento tem animação de entrada. */
export function hasAnimation(el: Element): boolean {
  return el.classList.contains('anim');
}

/** Localiza um elemento pelo path usado pelo iframe (`[slide, ...filhos]`). */
export function elementAtPath(html: string, path: number[]): Element | null {
  const [slideIndex, ...rest] = path;
  if (slideIndex === undefined) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let node: Element | null = doc.body.children[slideIndex] ?? null;
  for (const part of rest) {
    node = node?.children[part] ?? null;
    if (!node) return null;
  }
  return node;
}

/** Lê a animação de um elemento dentro do HTML de um slide. */
export function readAnimationAtPath(html: string, path: number[]): ElementAnimation | null {
  const el = elementAtPath(html, path);
  return el ? readAnimation(el) : null;
}

/**
 * Lê a animação de um elemento. Retorna `null` quando ele não anima.
 * Um `.anim` sem `data-anim` é lido como o `rise` legado.
 */
export function readAnimation(el: Element): ElementAnimation | null {
  if (!hasAnimation(el)) return null;
  const kind = el.getAttribute('data-anim') ?? ANIMATION_DEFAULTS.kind;
  const direction = el.getAttribute('data-anim-dir') ?? ANIMATION_DEFAULTS.direction;
  const inline = (el as HTMLElement).style;
  return normalizeAnimation({
    kind: KIND_SET.has(kind) ? (kind as AnimationKind) : ANIMATION_DEFAULTS.kind,
    direction: DIRECTION_SET.has(direction)
      ? (direction as AnimationDirection)
      : ANIMATION_DEFAULTS.direction,
    delay: parseTime(
      inline.getPropertyValue('--anim-delay') || inline.getPropertyValue('--d'),
      ANIMATION_DEFAULTS.delay
    ),
    duration: parseTime(inline.getPropertyValue('--anim-duration'), ANIMATION_DEFAULTS.duration),
    easing: inline.getPropertyValue('--anim-ease') || ANIMATION_DEFAULTS.easing,
    distance: parseTime(inline.getPropertyValue('--anim-distance'), ANIMATION_DEFAULTS.distance),
  });
}

export interface ElementPatch {
  /** `null` remove o atributo. */
  attrs?: Record<string, string | null>;
  /** `null` remove a propriedade CSS. */
  style?: Record<string, string | null>;
  /** Classes alteradas sem substituir as demais. */
  classes?: { add?: string[]; remove?: string[] };
}

/** Converte uma animação no patch de atributos/estilos gravado no HTML. */
export function animationPatch(animation: ElementAnimation | null): ElementPatch {
  if (!animation) {
    return {
      attrs: {
        'data-anim': null,
        'data-anim-dir': null,
      },
      classes: { remove: ['anim'] },
      style: {
        '--d': null,
        '--anim-delay': null,
        '--anim-duration': null,
        '--anim-ease': null,
        '--anim-distance': null,
      },
    };
  }

  const anim = normalizeAnimation(animation);
  return {
    attrs: {
      'data-anim': anim.kind,
      'data-anim-dir': anim.direction,
    },
    classes: { add: ['anim'] },
    style: {
      '--d': `${anim.delay}s`,
      '--anim-duration': `${anim.duration}s`,
      '--anim-ease': anim.easing,
      '--anim-distance': `${anim.distance}px`,
    },
  };
}

/**
 * Aplica (ou remove) a animação diretamente em um elemento do DOM.
 * Usado pelo editor, pelo preview e pelos testes.
 */
export function applyAnimation(el: HTMLElement, animation: ElementAnimation | null): void {
  applyElementPatch(el, animationPatch(animation));
}

/** Aplica um patch genérico de atributos/estilos (usado pela ponte e pelo store). */
export function applyElementPatch(el: Element, patch: ElementPatch): void {
  for (const [name, value] of Object.entries(patch.attrs ?? {})) {
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  }
  for (const name of patch.classes?.remove ?? []) el.classList.remove(name);
  for (const name of patch.classes?.add ?? []) el.classList.add(name);
  const style = (el as HTMLElement).style;
  for (const [name, value] of Object.entries(patch.style ?? {})) {
    if (value === null) style.removeProperty(name);
    else style.setProperty(name, value);
  }
}

/** Duração total da animação, incluindo atraso, em milissegundos. */
export function animationDuration(animation: ElementAnimation | null): number {
  if (!animation) return 0;
  const anim = normalizeAnimation(animation);
  return Math.round((anim.delay + anim.duration) * 1000);
}

const KEYFRAMES = `
@keyframes mmRise{from{opacity:0;transform:translateY(var(--anim-distance,26px))}to{opacity:1;transform:none}}
@keyframes mmFade{from{opacity:0}to{opacity:1}}
@keyframes mmSlideUp{from{opacity:0;transform:translateY(var(--anim-distance,26px))}to{opacity:1;transform:none}}
@keyframes mmSlideDown{from{opacity:0;transform:translateY(calc(var(--anim-distance,26px) * -1))}to{opacity:1;transform:none}}
@keyframes mmSlideLeft{from{opacity:0;transform:translateX(calc(var(--anim-distance,26px) * -1))}to{opacity:1;transform:none}}
@keyframes mmSlideRight{from{opacity:0;transform:translateX(var(--anim-distance,26px))}to{opacity:1;transform:none}}
@keyframes mmZoom{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
@keyframes mmBlur{from{opacity:0;filter:blur(14px)}to{opacity:1;filter:blur(0)}}
@keyframes mmFlip{from{opacity:0;transform:perspective(900px) rotateY(75deg)}to{opacity:1;transform:none}}
`;

/**
 * CSS injetado depois do template. O `rise` sem `data-anim` continua usando a
 * regra legada do template; aqui ficam os tipos explícitos e os overrides de
 * duração/easing.
 */
export const ANIMATION_CSS = `
${KEYFRAMES}
.slide.active .anim[data-anim]{
  animation-duration:var(--anim-duration,.85s);
  animation-delay:var(--d,0s);
  animation-timing-function:var(--anim-ease,cubic-bezier(.16,.84,.24,1));
  animation-fill-mode:both;
}
.slide.active .anim[data-anim="rise"]{animation-name:mmRise}
.slide.active .anim[data-anim="fade"]{animation-name:mmFade}
.slide.active .anim[data-anim="slide"]{animation-name:mmSlideUp}
.slide.active .anim[data-anim="slide"][data-anim-dir="down"]{animation-name:mmSlideDown}
.slide.active .anim[data-anim="slide"][data-anim-dir="left"]{animation-name:mmSlideLeft}
.slide.active .anim[data-anim="slide"][data-anim-dir="right"]{animation-name:mmSlideRight}
.slide.active .anim[data-anim="zoom"]{animation-name:mmZoom}
.slide.active .anim[data-anim="blur"]{animation-name:mmBlur}
.slide.active .anim[data-anim="flip"]{animation-name:mmFlip}
.slide.mm-static .anim[data-anim]{animation:none!important;opacity:1!important;transform:none!important;filter:none!important}
@media (prefers-reduced-motion:reduce){
  .slide.active .anim[data-anim]{animation:none!important;opacity:1!important;transform:none!important;filter:none!important}
}
@media print{
  .slide.active .anim[data-anim]{animation:none!important;opacity:1!important;transform:none!important;filter:none!important}
}
`.trim();
