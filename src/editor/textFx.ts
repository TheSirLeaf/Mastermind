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
  /** Tamanho: quanto a sombra cresce para além da letra (px). */
  size: number;
  color: string;
  opacity: number;
}

/** Brilho que passa pelo texto (animação contínua; configurado na aba Animação). */
export interface TextShine {
  color: string;
  /** Intervalo entre uma passada e a próxima (s). */
  seconds: number;
  /** Largura da faixa de luz (% do texto). */
  width: number;
  angle: number;
  /** Quando a primeira passada começa, desde a entrada do slide (s). */
  delay: number;
}

export const DEFAULT_SHINE: TextShine = {
  color: '#FFFFFF',
  seconds: 3.2,
  width: 12,
  angle: 110,
  delay: 0,
};

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
  '--mm-shine-d',
  '--mm-shine-p0',
  '--mm-shine-p1',
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

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' && v ? v : d);

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

/**
 * `text-shadow` não tem "tamanho" (spread): ele é imitado com cópias da sombra num anel ao redor
 * da original. A opacidade de cada cópia é reduzida para a soma ficar próxima da pedida.
 */
export function shadowCss(shadows: TextShadow[]): string | null {
  if (!shadows.length) return null;
  const out: string[] = [];
  for (const s of shadows) {
    const size = Math.max(0, s.size || 0);
    if (size < 0.01) {
      out.push(
        `${round(s.x)}px ${round(s.y)}px ${round(s.blur)}px ${withAlpha(s.color, s.opacity)}`
      );
      continue;
    }
    const alpha = 1 - (1 - Math.min(1, Math.max(0, s.opacity))) ** (1 / 3);
    const color = withAlpha(s.color, round(alpha));
    out.push(`${round(s.x)}px ${round(s.y)}px ${round(s.blur)}px ${color}`);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      out.push(
        `${round(s.x + Math.cos(a) * size, 2)}px ${round(s.y + Math.sin(a) * size, 2)}px ${round(s.blur)}px ${color}`
      );
    }
  }
  return out.join(', ');
}

/**
 * Variáveis do brilho que passa. A imagem do brilho tem 4× o tamanho do texto e anda na diagonal
 * do quadrante do ângulo: assim a faixa sempre atravessa o texto inteiro (inclusive em 0° e
 * 180°) e fica totalmente fora dele no começo e no fim (não se vê a faixa "parada").
 */
export function shineVars(shine: TextShine): Record<string, string> {
  const rad = (shine.angle * Math.PI) / 180;
  const sign = (v: number) => (Math.abs(v) < 0.02 ? 0 : Math.sign(v));
  const dx = sign(Math.sin(rad));
  const dy = sign(-Math.cos(rad));
  return {
    '--mm-shine-c': shine.color,
    '--mm-shine-t': `${round(Math.max(0.2, shine.seconds), 2)}s`,
    // meia largura da faixa, em % da linha do gradiente (que tem 4× o texto)
    '--mm-shine-w': `${round(Math.max(0.5, shine.width) / 8, 3)}%`,
    '--mm-shine-a': `${round(shine.angle, 1)}deg`,
    '--mm-shine-d': `${round(Math.max(0, shine.delay), 2)}s`,
    '--mm-shine-p0': `${50 + 50 * dx}% ${50 + 50 * dy}%`,
    '--mm-shine-p1': `${50 - 50 * dx}% ${50 - 50 * dy}%`,
  };
}

export function parseShine(raw: string | null | undefined): TextShine | null {
  if (!raw) return null;
  try {
    const d: unknown = JSON.parse(raw);
    if (!isObj(d)) return null;
    return {
      color: str(d.color, DEFAULT_SHINE.color),
      seconds: num(d.seconds, DEFAULT_SHINE.seconds),
      width: num(d.width, DEFAULT_SHINE.width),
      angle: num(d.angle, DEFAULT_SHINE.angle),
      delay: num(d.delay, 0),
    };
  } catch {
    return null;
  }
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
        Object.assign(css, shineVars({ ...fill.shine, delay: 0 }));
      }
    }
  }
  const filters: string[] = [];
  if (fx.stroke && fx.stroke.width > 0) {
    const w = fx.stroke.width;
    const color = withAlpha(fx.stroke.color, fx.stroke.opacity);
    if (!fx.stroke.outside) {
      // No meio: o traço fica metade para dentro e metade para fora da letra.
      css['-webkit-text-stroke'] = `${round(w, 2)}px ${color}`;
    } else if (clipPad === 0) {
      // Por fora (cor sólida): a letra é pintada por cima do traço, que tem o dobro da largura
      // para sobrar a espessura pedida do lado de fora.
      css['-webkit-text-stroke'] = `${round(w * 2, 2)}px ${color}`;
      css['paint-order'] = 'stroke fill';
    } else {
      // Por fora (gradiente/brilho): a letra é transparente, então pintar "por cima" não esconde
      // nada. O contorno vem de quatro sombras duras encadeadas (dilatam a forma da letra).
      const o = round(w, 2);
      filters.push(
        `drop-shadow(${o}px 0 0 ${color})`,
        `drop-shadow(${-o}px 0 0 ${color})`,
        `drop-shadow(0 ${o}px 0 ${color})`,
        `drop-shadow(0 ${-o}px 0 ${color})`
      );
    }
  }
  if (clipPad > 0) {
    // Com o preenchimento recortado (letra transparente), o text-shadow apareceria através da
    // letra e desbotaria o gradiente; drop-shadow fica por trás do que foi pintado. Ele não tem
    // "tamanho", então o tamanho entra como desfoque extra.
    for (const s of fx.shadows) {
      const blur = s.blur / 2 + Math.max(0, s.size || 0) * 0.6;
      filters.push(
        `drop-shadow(${round(s.x)}px ${round(s.y)}px ${round(blur)}px ${withAlpha(s.color, s.opacity)})`
      );
    }
  } else {
    css['text-shadow'] = shadowCss(fx.shadows);
  }
  if (filters.length) css.filter = filters.join(' ');
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
          size: num(x.size, 0),
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
    ['soft', 'Suave', () => [{ x: 0, y: 4, blur: 14, size: 0, color: '#000000', opacity: 0.45 }]],
    [
      'strong',
      'Forte',
      () => [
        { x: 5, y: 7, blur: 0, size: 0, color: '#000000', opacity: 0.85 },
        { x: 0, y: 10, blur: 30, size: 0, color: '#000000', opacity: 0.5 },
      ],
    ],
    [
      'glow',
      'Neon',
      (c) => [
        { x: 0, y: 0, blur: 8, size: 0, color: c, opacity: 1 },
        { x: 0, y: 0, blur: 24, size: 0, color: c, opacity: 0.9 },
        { x: 0, y: 0, blur: 60, size: 0, color: c, opacity: 0.7 },
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
          size: 0,
          color: '#10060B',
          opacity: 0.9 - i * 0.1,
        })),
    ],
  ];
