import { itemAt, useDeckStore } from '@store/deckStore';

export type BaseElementKind = 'watermark' | 'light' | 'counter';

const ELEMENTS: Record<BaseElementKind, { label: string; html: string }> = {
  watermark: {
    label: 'Marca d’água',
    html: '<div class="ed-obj ed-text" style="position:absolute;left:300px;top:420px;width:1320px;z-index:1;font-family:Georgia,serif;font-weight:700;font-size:200px;letter-spacing:.1em;text-align:center;color:rgba(255,255,255,.07);rotate:-10deg">MARCA D’ÁGUA</div>',
  },
  light: {
    label: 'Efeito de luz',
    html: '<div class="ed-obj ed-shape" style="position:absolute;left:1100px;top:-300px;width:1100px;height:1100px;z-index:0;border-radius:50%;background:radial-gradient(circle,rgba(199,124,138,.38),transparent 65%)"></div>',
  },
  counter: {
    label: 'Contador de slides',
    html: '<div class="foot-r ed-obj" style="position:absolute;right:120px;bottom:44px;z-index:2;font-size:22px">00 <span>/ 00</span></div>',
  },
};

export const BASE_ELEMENT_LABELS: Array<[BaseElementKind, string]> = (
  Object.keys(ELEMENTS) as BaseElementKind[]
).map((kind) => [kind, ELEMENTS[kind].label]);

/** Insere marca d'água, luz ou contador no slide base atual e o seleciona. */
export function insertBaseElement(kind: BaseElementKind): boolean {
  const state = useDeckStore.getState();
  const index = state.currentIndex;
  const item = itemAt(state.deck, index);
  if (!item || index < state.deck.slides.length) return false;
  const doc = new DOMParser().parseFromString(item.html, 'text/html');
  const section = doc.body.firstElementChild;
  if (!section) return false;
  const holder = doc.createElement('div');
  holder.innerHTML = ELEMENTS[kind].html;
  const element = holder.firstElementChild;
  if (!element) return false;
  section.appendChild(element);
  state.updateSlideHTML(index, section.outerHTML);
  state.requestSelection([index, section.children.length - 1], kind === 'watermark');
  return true;
}
