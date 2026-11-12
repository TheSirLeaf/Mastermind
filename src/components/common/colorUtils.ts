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
