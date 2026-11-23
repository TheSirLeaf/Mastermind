// components/Text/effectsShared.ts
// Constantes do painel de efeitos de texto (fora dos componentes, para o recarregamento rápido do Vite).

/** `-webkit-box-reflect` só existe em Chromium/Safari; no Firefox o reflexo é descartado. */
export const REFLECT_UNSUPPORTED =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  !CSS.supports('-webkit-box-reflect', 'below');

export const GRADIENT_PRESETS: string[][] = [
  ['#F7D98B', '#C77C8A'],
  ['#FFF8F5', '#D6A84F'],
  ['#8FB8D8', '#8B5CF6'],
  ['#22C55E', '#06B6D4'],
  ['#F97316', '#EC4899'],
  ['#FFFFFF', '#737373'],
  ['#F7D98B', '#FFF8F5', '#C77C8A'],
  ['#EF4444', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'],
];

export const clone = <T>(v: T): T => structuredClone(v);

export const iconBtn =
  'flex h-6 w-6 items-center justify-center rounded text-payday-textMuted transition hover:bg-white/5 hover:text-accent';
