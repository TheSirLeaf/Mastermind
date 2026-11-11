import { useDeckStore } from '@store/deckStore';

export type InsertableElement = 'text' | 'image' | 'rect' | 'ellipse' | 'line';

export interface InsertElementOptions {
  /** Data URL ou URL da imagem (obrigatório para `image`). */
  src?: string;
}

export interface InsertElementResult {
  label: string;
  path: number[];
}

const LABELS: Record<InsertableElement, string> = {
  text: 'Texto',
  image: 'Imagem',
  rect: 'Retângulo',
  ellipse: 'Elipse',
  line: 'Linha',
};

let insertCount = 0;

/**
 * Insere um elemento básico no slide atual, posicionado em coordenadas do
 * canvas 1920×1080, e deixa o elemento selecionado.
 */
export function insertElement(
  kind: InsertableElement,
  options: InsertElementOptions = {}
): InsertElementResult | null {
  const state = useDeckStore.getState();
  const index = state.currentIndex;
  const slide = state.deck.slides[index];
  if (!slide) return null;

  const doc = new DOMParser().parseFromString(slide.html, 'text/html');
  const section = doc.body.firstElementChild;
  if (!section) return null;

  const offset = (insertCount++ % 8) * 24;
  const left = 620 + offset;
  const top = 400 + offset;

  let element: Element;
  if (kind === 'image') {
    if (!options.src) return null;
    const img = doc.createElement('img');
    img.setAttribute('src', options.src);
    img.setAttribute('alt', 'Imagem inserida');
    img.setAttribute(
      'style',
      `position:absolute;left:${left}px;top:${top}px;width:720px;height:auto`
    );
    element = img;
  } else {
    const div = doc.createElement('div');
    if (kind === 'text') {
      div.textContent = 'Digite seu texto';
      div.setAttribute(
        'style',
        `position:absolute;left:${left}px;top:${top}px;width:640px;` +
          'font-family:Georgia, serif;font-size:36px;line-height:1.25;color:#F3E6E2'
      );
    } else if (kind === 'rect' || kind === 'ellipse') {
      div.setAttribute(
        'style',
        `position:absolute;left:${left}px;top:${top}px;width:600px;height:320px;` +
          `background:#F7D98B;border-radius:${kind === 'ellipse' ? '50%' : '4px'}`
      );
    } else {
      div.setAttribute(
        'style',
        `position:absolute;left:${left}px;top:${top + 150}px;width:600px;height:4px;` +
          'background:#F7D98B;border-radius:2px'
      );
    }
    element = div;
  }

  section.appendChild(element);
  state.updateSlideHTML(index, section.outerHTML);
  const path = [index, section.children.length - 1];
  state.requestSelection(path);

  return { label: LABELS[kind], path };
}
