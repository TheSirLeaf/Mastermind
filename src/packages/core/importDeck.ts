import { newSlideId, renumberFooters } from './deck';
import type { Deck } from './types';

export interface ImportDeckOptions {
  /** Título usado quando o arquivo não tem `<title>`. */
  title?: string;
}

/**
 * Importa um deck a partir de um HTML de apresentação.
 *
 * Aceita tanto o template do editor (`#deck > section.slide`) quanto um HTML
 * exportado ou o arquivo monolítico antigo. Os slides são preservados como
 * HTML para manter fontes, SVGs, imagens e classes originais.
 */
export function parseDeckHTML(html: string, options: ImportDeckOptions = {}): Deck {
  if (!html || !html.trim()) throw new Error('O arquivo está vazio.');

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Remove artefatos do editor, caso o arquivo tenha sido salvo pelo iframe.
  doc.querySelectorAll('#mm-sel, [data-mm-editing]').forEach((node) => node.remove());

  let slides = Array.from(doc.querySelectorAll('#deck > section.slide'));
  if (slides.length === 0) slides = Array.from(doc.querySelectorAll('section.slide'));
  if (slides.length === 0) {
    throw new Error('Nenhum slide (`section.slide`) foi encontrado no arquivo.');
  }

  const documentTitle = (doc.querySelector('title')?.textContent ?? '').trim();
  const parsed: Deck = {
    title: options.title || documentTitle || 'Apresentação importada',
    slides: slides.map((section) => ({
      id: newSlideId(),
      html: section.outerHTML,
    })),
  };

  parsed.slides = renumberFooters(parsed.slides);
  return parsed;
}

/** Detecta se um HTML parece ser um deck importável. */
export function looksLikeDeckHTML(html: string): boolean {
  return /class="[^"]*\bslide\b/.test(html) && /<section\b/i.test(html);
}
