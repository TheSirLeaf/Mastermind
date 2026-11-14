// Fontes oferecidas no editor (barra do trecho e inspetor usam a mesma lista).
export const TEXT_FONTS: Array<[value: string, label: string]> = [
  ['', 'Padrão do texto'],
  ["'DM Sans', system-ui, sans-serif", 'DM Sans'],
  ["'Cormorant Garamond', Georgia, serif", 'Cormorant Garamond'],
  ["Georgia, 'Times New Roman', serif", 'Georgia'],
  ["'Times New Roman', Times, serif", 'Times New Roman'],
  ['Arial, Helvetica, sans-serif', 'Arial'],
  ["'Segoe UI', system-ui, sans-serif", 'Segoe UI'],
  ["'Trebuchet MS', sans-serif", 'Trebuchet'],
  ['Verdana, sans-serif', 'Verdana'],
  ["Impact, 'Arial Black', sans-serif", 'Impact'],
  ["ui-monospace, 'Cascadia Mono', Consolas, monospace", 'Monoespaçada'],
  ["'Brush Script MT', 'Segoe Script', cursive", 'Manuscrita'],
];

export const firstFamily = (font: string): string =>
  (font.split(',')[0] ?? '').replace(/["']/g, '').trim().toLowerCase();

/** Nome amigável da fonte (pela primeira família da lista). */
export function fontLabel(font: string, empty = 'Fonte'): string {
  const fam = firstFamily(font);
  if (!fam) return empty;
  const hit = TEXT_FONTS.find(([value]) => value && firstFamily(value) === fam);
  return hit ? hit[1] : (font.split(',')[0] ?? '').replace(/["']/g, '').trim();
}
