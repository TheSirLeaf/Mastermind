// editor/textFx.ts
// Efeitos de texto (preenchimento, contorno, sombras, marca-texto, reflexo…) descritos como dados
// e convertidos em CSS. O mesmo formato vale para um trecho (<span data-fx>) e para a caixa toda.

export interface GradientStop {
  color: string;
  /** Posição de 0 a 100. */
  at: number;
}

export interface TextFill {
  kind: 'solid' | 'gradient' | 'shine';
  color: string;
  /** 0–1 */
  opacity: number;
  gradient: { type: 'linear' | 'radial'; angle: number; stops: GradientStop[] };
  shine: { color: string; seconds: number; width: number; angle: number };
}

export interface TextStroke {
  width: number;
  color: string;
  opacity: number;
  /** Fora: o contorno não "come" a letra (paint-order). */
  outside: boolean;
}

export interface TextShadow {
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface TextHighlight {
  color: string;
  opacity: number;
  radius: number;
  /** Folga ao redor do texto (em). */
  pad: number;
}

export interface TextFx {
  fill: TextFill | null;
  stroke: TextStroke | null;
  shadows: TextShadow[];
  highlight: TextHighlight | null;
  /** Espaço entre letras (em). */
  spacing: number;
  transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /** 0–1 */
  opacity: number;
}

export interface TextReflect {
  side: 'below' | 'above' | 'left' | 'right';
  gap: number;
  /** 0–1 */
  opacity: number;
  /** Onde o reflexo começa a sumir (0–100). */
  fade: number;
}

export const DEFAULT_FILL: TextFill = {
  kind: 'solid',
  color: '#FFF8F5',
  opacity: 1,
  gradient: {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#F7D98B', at: 0 },
      { color: '#C77C8A', at: 100 },
    ],
  },
  shine: { color: '#FFFFFF', seconds: 3.2, width: 12, angle: 110 },
};

export const DEFAULT_FX: TextFx = {
  fill: null,
  stroke: null,
  shadows: [],
  highlight: null,
  spacing: 0,
  transform: 'none',
  opacity: 1,
};

export const DEFAULT_REFLECT: TextReflect = { side: 'below', gap: 0, opacity: 0.3, fade: 40 };

/** Propriedades que os efeitos controlam (as não usadas são removidas). */
export const FX_PROPS = [
  'color',
  '-webkit-text-fill-color',
  'background-image',
  '-webkit-background-clip',
  'background-clip',
  'background-size',
  'background-repeat',
  '--mm-shine-c',
  '--mm-shine-t',
  '--mm-shine-w',
  '--mm-shine-a',
  '-webkit-text-stroke',
  'paint-order',
  'text-shadow',
  'filter',
  'box-shadow',
  'border-radius',
  'padding',
  'margin',
  '-webkit-box-decoration-break',
  'box-decoration-break',
  'letter-spacing',
  'text-transform',
  'opacity',
] as const;

/**
 * Valores "neutros" para quando um trecho está dentro de outro com efeito: as propriedades
 * herdadas precisam ser desligadas explicitamente (senão o texto herda o preenchimento
 * transparente do gradiente de fora e some).
 */
export const FX_RESETS: Record<string, string> = {
  '-webkit-text-fill-color': 'currentcolor',
  'text-shadow': 'none',
  '-webkit-text-stroke': '0 transparent',
  'letter-spacing': 'normal',
  'text-transform': 'none',
  'paint-order': 'normal',
};

/** `#RRGGBB` + opacidade → `rgba(...)` (ou o hex quando opaco). */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  if (alpha >= 0.999) return `#${m[1]!.toUpperCase()}`;
  const n = parseInt(m[1]!, 16);
  const a = Math.round(Math.max(0, alpha) * 1000) / 1000;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

export function gradientCss(g: TextFill['gradient']): string {
  const stops = [...g.stops]
    .sort((a, b) => a.at - b.at)
    .map((s) => `${s.color} ${round(s.at, 1)}%`)
    .join(', ');
  return g.type === 'radial'
    ? `radial-gradient(circle at center, ${stops})`
    : `linear-gradient(${round(g.angle, 1)}deg, ${stops})`;
}

export function shadowCss(shadows: TextShadow[]): string | null {
  if (!shadows.length) return null;
  return shadows
    .map(
      (s) => `${round(s.x)}px ${round(s.y)}px ${round(s.blur)}px ${withAlpha(s.color, s.opacity)}`
    )
    .join(', ');
}

/** CSS completo dos efeitos: toda propriedade de `FX_PROPS` aparece (null = remover). */
export function textFxToCss(fx: TextFx): Record<string, string | null> {
  const css: Record<string, string | null> = {};
  for (const p of FX_PROPS) css[p] = null;
  const fill = fx.fill;
  // Gradiente/brilho recortados no texto: itálico e letras largas passam da caixa do trecho;
  // a folga (padding compensado por margem negativa) evita cortar a ponta.
  let clipPad = 0;
  if (fill) {
    if (fill.kind === 'solid') {
      css.color = withAlpha(fill.color, fill.opacity);
    } else {
      css['-webkit-background-clip'] = 'text';
      css['background-clip'] = 'text';
      css['-webkit-text-fill-color'] = 'transparent';
      css['-webkit-box-decoration-break'] = 'clone';
      css['box-decoration-break'] = 'clone';
      clipPad = 0.2;
      if (fill.kind === 'gradient') {
        css['background-image'] = gradientCss(fill.gradient);
      } else {
        css.color = withAlpha(fill.color, fill.opacity);
        css['--mm-shine-c'] = fill.shine.color;
        css['--mm-shine-t'] = `${round(fill.shine.seconds, 2)}s`;
        css['--mm-shine-w'] = `${round(fill.shine.width, 1)}%`;
        css['--mm-shine-a'] = `${round(fill.shine.angle, 1)}deg`;
      }
    }
  }
  if (fx.stroke && fx.stroke.width > 0) {
    css['-webkit-text-stroke'] =
      `${round(fx.stroke.width, 2)}px ${withAlpha(fx.stroke.color, fx.stroke.opacity)}`;
    if (fx.stroke.outside) css['paint-order'] = 'stroke fill';
  }
  if (clipPad > 0 && fx.shadows.length) {
    // Com o preenchimento recortado (letra transparente), o text-shadow apareceria através da
    // letra e desbotaria o gradiente; drop-shadow fica por trás do que foi pintado.
    css.filter = fx.shadows
      .map(
        (s) =>
          `drop-shadow(${round(s.x)}px ${round(s.y)}px ${round(s.blur / 2)}px ${withAlpha(s.color, s.opacity)})`
      )
      .join(' ');
  } else {
    css['text-shadow'] = shadowCss(fx.shadows);
  }
  let pad = clipPad;
  if (fx.highlight) {
    const h = fx.highlight;
    css['box-shadow'] = `inset 0 0 0 100em ${withAlpha(h.color, h.opacity)}`;
    css['border-radius'] = h.radius ? `${round(h.radius, 2)}em` : null;
    css['-webkit-box-decoration-break'] = 'clone';
    css['box-decoration-break'] = 'clone';
    pad = Math.max(pad, h.pad);
  }
  if (pad > 0) {
    const v = round(pad / 2, 3);
    css.padding = `${v}em ${round(pad, 3)}em`;
    css.margin = `0 ${round(-pad, 3)}em`;
  }
  if (Math.abs(fx.spacing) > 0.001) css['letter-spacing'] = `${round(fx.spacing)}em`;
  if (fx.transform !== 'none') css['text-transform'] = fx.transform;
  if (fx.opacity < 0.999) css.opacity = String(round(fx.opacity));
  return css;
}

/** Igual a `textFxToCss`, mas com valores neutros explícitos para o que é herdado. */
export function textFxToNestedCss(fx: TextFx): Record<string, string | null> {
  const css = textFxToCss(fx);
  for (const [k, v] of Object.entries(FX_RESETS)) if (css[k] === null) css[k] = v;
  return css;
}

export function reflectToCss(r: TextReflect | null): string | null {
  if (!r) return null;
  const a = round(r.opacity);
  return `${r.side} ${round(r.gap)}px linear-gradient(transparent ${round(r.fade, 1)}%, rgba(255, 255, 255, ${a}))`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' && v ? v : d);

/** Lê o JSON do `data-fx` tolerando campos faltando ou inválidos. */
export function parseTextFx(raw: string | null | undefined): TextFx {
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!isObj(data)) return structuredClone(DEFAULT_FX);
  const f = isObj(data.fill) ? data.fill : null;
  const g = f && isObj(f.gradient) ? f.gradient : {};
  const sh = f && isObj(f.shine) ? f.shine : {};
  const stops = Array.isArray(g.stops)
    ? g.stops.filter(isObj).map((s) => ({ color: str(s.color, '#FFFFFF'), at: num(s.at, 0) }))
    : [];
  const fill: TextFill | null = f
    ? {
        kind: f.kind === 'gradient' || f.kind === 'shine' ? f.kind : 'solid',
        color: str(f.color, DEFAULT_FILL.color),
        opacity: num(f.opacity, 1),
        gradient: {
          type: g.type === 'radial' ? 'radial' : 'linear',
          angle: num(g.angle, 90),
          stops: stops.length >= 2 ? stops : structuredClone(DEFAULT_FILL.gradient.stops),
        },
        shine: {
          color: str(sh.color, '#FFFFFF'),
          seconds: num(sh.seconds, 3.2),
          width: num(sh.width, 12),
          angle: num(sh.angle, 110),
        },
      }
    : null;
  const s = isObj(data.stroke) ? data.stroke : null;
  const h = isObj(data.highlight) ? data.highlight : null;
  const transform = data.transform;
  return {
    fill,
    stroke: s
      ? {
          width: num(s.width, 2),
          color: str(s.color, '#10060B'),
          opacity: num(s.opacity, 1),
          outside: s.outside !== false,
        }
      : null,
    shadows: Array.isArray(data.shadows)
      ? data.shadows.filter(isObj).map((x) => ({
          x: num(x.x, 0),
          y: num(x.y, 4),
          blur: num(x.blur, 12),
          color: str(x.color, '#000000'),
          opacity: num(x.opacity, 0.5),
        }))
      : [],
    highlight: h
      ? {
          color: str(h.color, '#F7D98B'),
          opacity: num(h.opacity, 0.35),
          radius: num(h.radius, 0.15),
          pad: num(h.pad, 0.15),
        }
      : null,
    spacing: num(data.spacing, 0),
    transform:
      transform === 'uppercase' || transform === 'lowercase' || transform === 'capitalize'
        ? transform
        : 'none',
    opacity: num(data.opacity, 1),
  };
}

export function parseReflect(raw: string | null | undefined): TextReflect | null {
  if (!raw) return null;
  try {
    const d: unknown = JSON.parse(raw);
    if (!isObj(d)) return null;
    const side = d.side;
    return {
      side: side === 'above' || side === 'left' || side === 'right' ? side : 'below',
      gap: num(d.gap, 0),
      opacity: num(d.opacity, 0.3),
      fade: num(d.fade, 40),
    };
  } catch {
    return null;
  }
}

/** Efeito "vazio" (nada a guardar): o `data-fx` pode sair. */
export function isEmptyFx(fx: TextFx): boolean {
  return (
    !fx.fill &&
    !fx.stroke &&
    fx.shadows.length === 0 &&
    !fx.highlight &&
    Math.abs(fx.spacing) < 0.001 &&
    fx.transform === 'none' &&
    fx.opacity >= 0.999
  );
}

export const SHADOW_PRESETS: Array<[id: string, label: string, make: (c: string) => TextShadow[]]> =
  [
    ['none', 'Nenhuma', () => []],
    ['soft', 'Suave', () => [{ x: 0, y: 4, blur: 14, color: '#000000', opacity: 0.45 }]],
    [
      'strong',
      'Forte',
      () => [
        { x: 5, y: 7, blur: 0, color: '#000000', opacity: 0.85 },
        { x: 0, y: 10, blur: 30, color: '#000000', opacity: 0.5 },
      ],
    ],
    [
      'glow',
      'Neon',
      (c) => [
        { x: 0, y: 0, blur: 8, color: c, opacity: 1 },
        { x: 0, y: 0, blur: 24, color: c, opacity: 0.9 },
        { x: 0, y: 0, blur: 60, color: c, opacity: 0.7 },
      ],
    ],
    [
      'long',
      'Longa',
      () =>
        [1, 2, 3, 4, 5, 6].map((i) => ({
          x: i * 2,
          y: i * 2,
          blur: 0,
          color: '#10060B',
          opacity: 0.9 - i * 0.1,
        })),
    ],
  ];
