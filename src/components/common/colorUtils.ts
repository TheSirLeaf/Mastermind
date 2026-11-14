// Utilitários do seletor de cores.

/** Aceita `#abc`, `abc`, `#aabbcc`, `aabbcc` e `rgb(r, g, b)`; devolve `#RRGGBB` ou `null`. */
export function normalizeHex(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+[\d.]+%?)?\s*\)$/i.exec(
    text
  );
  if (rgb) {
    const parts = [rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n)));
    return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (!hex) return null;
  const digits = hex[1] ?? '';
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((c) => c + c)
          .join('')
      : digits;
  return `#${full}`.toUpperCase();
}

/** Cores básicas da grade (neutros, marca e cores comuns). */
export const BASIC_COLORS: string[] = [
  '#FFFFFF',
  '#E5E5E5',
  '#A3A3A3',
  '#525252',
  '#262626',
  '#000000',
  '#F7D98B',
  '#D6A84F',
  '#C77C8A',
  '#8E3B52',
  '#411725',
  '#2A0E1A',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#72A68A',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#8FB8D8',
  '#8B5CF6',
  '#EC4899',
];

const RECENT_KEY = 'mm-recent-colors';
const RECENT_MAX = 10;

export function readRecentColors(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((c): c is string => typeof c === 'string').slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

export function rememberColor(hex: string): string[] {
  const normalized = normalizeHex(hex);
  if (!normalized) return readRecentColors();
  const next = [normalized, ...readRecentColors().filter((c) => c !== normalized)].slice(
    0,
    RECENT_MAX
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Sem armazenamento: só não guarda os recentes.
  }
  return next;
}

/** HSV (h 0–360, s/v 0–1) → `#RRGGBB`. */
export function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return `#${[f(5), f(3), f(1)].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** `#RRGGBB` → HSV (h 0–360, s/v 0–1). */
export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const n = normalizeHex(hex) ?? '#000000';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

/** Grade de tons: 12 matizes × 5 claridades, mais uma linha de cinzas. */
export const TONAL_COLORS: string[] = (() => {
  const hues = [0, 20, 38, 52, 75, 130, 165, 190, 215, 250, 285, 325];
  const rows: Array<[number, number]> = [
    [0.18, 1],
    [0.45, 1],
    [0.8, 0.95],
    [0.85, 0.7],
    [0.85, 0.42],
  ];
  const out: string[] = [];
  for (const [s, v] of rows) for (const h of hues) out.push(hsvToHex(h, s, v));
  for (let i = 0; i < 12; i += 1) out.push(hsvToHex(0, 0, 1 - i / 11));
  return out;
})();
