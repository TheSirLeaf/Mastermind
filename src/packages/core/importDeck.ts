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
  doc.querySelectorAll('#mm-sel, #mm-grid, [data-mm-editing]').forEach((node) => node.remove());

  // Bases embutidas na exportação e slides base (não apresentados) gravados pelo editor.
  let bases: Deck['bases'];
  let modelId: string | undefined;
  try {
    const meta = JSON.parse(doc.getElementById('mm-bases')?.textContent ?? 'null') as {
      bases?: Array<{ id: string; html: string }>;
      modelId?: string;
    } | null;
    if (meta?.bases?.length) {
      bases = meta.bases.map((b) => ({ id: b.id || newSlideId(), html: b.html }));
      modelId = meta.modelId;
    }
  } catch {
    bases = undefined;
  }
  doc.querySelectorAll('.mm-bgl').forEach((node) => node.remove());
  doc.querySelectorAll('section.slide[data-base-id]').forEach((node) => node.remove());

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
    ...(bases ? { bases } : {}),
    ...(modelId ? { modelId } : {}),
  };

  parsed.slides = renumberFooters(parsed.slides);
  return parsed;
}

/** Detecta se um HTML parece ser um deck importável. */
export function looksLikeDeckHTML(html: string): boolean {
  return /class="[^"]*\bslide\b/.test(html) && /<section\b/i.test(html);
}
