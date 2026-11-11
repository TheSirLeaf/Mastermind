import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';

/** Índice do slide no path reportado pelo iframe. */
export function slideIndexFromSelection(selection: SelectionInfo): number | null {
  const index = selection.path[0];
  return typeof index === 'number' ? index : null;
}

/**
 * Lê o elemento selecionado a partir do HTML do slide.
 *
 * O primeiro item do path é o índice do slide; os demais são filhos da
 * `<section>`. O template guarda um único `<section>` no body do HTML.
 */
export function readSelectedElement(selection: SelectionInfo): Element | null {
  const index = slideIndexFromSelection(selection);
  if (index === null) return null;
  const slide = useDeckStore.getState().deck.slides[index];
  if (!slide) return null;

  const doc = new DOMParser().parseFromString(slide.html, 'text/html');
  let node: Element | null = doc.body.firstElementChild;
  for (const part of selection.path.slice(1)) {
    if (typeof part !== 'number') return null;
    node = node?.children[part] ?? null;
    if (!node) return null;
  }
  return node;
}

/**
 * Aplica uma mutação no elemento selecionado e persiste o HTML do slide.
 * Usa `updateSlideHTML` (e não `updateElementHTML`), porque o path aponta para
 * um elemento dentro do slide, não para o innerHTML dele.
 */
export function mutateSelectedElement(
  selection: SelectionInfo,
  mutate: (element: Element) => void
): void {
  const index = slideIndexFromSelection(selection);
  if (index === null) return;
  const slide = useDeckStore.getState().deck.slides[index];
  if (!slide) return;

  const doc = new DOMParser().parseFromString(slide.html, 'text/html');
  let node: Element | null = doc.body.firstElementChild;
  for (const part of selection.path.slice(1)) {
    if (typeof part !== 'number') return;
    node = node?.children[part] ?? null;
    if (!node) return;
  }
  if (!node) return;

  mutate(node);
  const nextHTML = doc.body.firstElementChild?.outerHTML ?? slide.html;
  useDeckStore.getState().updateSlideHTML(index, nextHTML, `element:${selection.path.join('.')}`);
}

/** Lê o `style` inline do elemento como um mapa. */
export function readInlineStyle(element: Element | null): Record<string, string> {
  const style = element?.getAttribute('style') ?? '';
  const output: Record<string, string> = {};
  for (const pair of style.split(';')) {
    const separator = pair.indexOf(':');
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) output[key] = value;
  }
  return output;
}
