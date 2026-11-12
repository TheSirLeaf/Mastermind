import { registry } from '@packages/core/PackageRegistry';
import type { PackageSpec } from '@packages/core/types';
import { itemAt, useDeckStore } from '@store/deckStore';

export interface InsertPackageResult {
  slideIndex: number;
  path: number[];
  label: string;
}

/**
 * Insere um elemento do pacote no slide atual, já posicionado no palco,
 * com o preset opcional aplicado. Devolve o caminho do novo elemento para
 * que o Inspetor possa selecioná-lo.
 */
export function insertPackage(id: string, presetIndex = -1): InsertPackageResult | null {
  const def = registry.get(id);
  if (!def) return null;

  const store = useDeckStore.getState();
  const slideIndex = store.currentIndex;
  const slide = itemAt(store.deck, slideIndex);
  if (!slide) return null;

  const doc = new DOMParser().parseFromString(slide.html, 'text/html');
  const section = doc.body.firstElementChild;
  if (!section) return null;

  const preset = presetIndex >= 0 ? def.presets?.[presetIndex] : undefined;
  const spec = { ...def.defaults, ...(preset?.spec ?? {}) } as PackageSpec;

  const count = section.querySelectorAll('[data-pkg]').length;
  const offset = (count % 6) * 28;
  const width = Number(spec.w) || def.box?.w || 900;

  const element = doc.createElement('div');
  element.className = 'pk-wrap';
  element.setAttribute('data-pkg', id);
  element.setAttribute('data-spec', JSON.stringify(spec));
  element.setAttribute(
    'style',
    `position:absolute;left:${Math.round((1920 - width) / 2 + offset)}px;top:${280 + offset}px;width:${width}px;max-width:100%;z-index:3`
  );
  element.innerHTML = registry.toHTML(id, spec);
  section.appendChild(element);

  const path = [slideIndex, section.children.length - 1];
  store.updateSlideHTML(slideIndex, section.outerHTML);
  store.requestSelection(path);

  return { slideIndex, path, label: preset ? `${def.name} · ${preset.name}` : def.name };
}
