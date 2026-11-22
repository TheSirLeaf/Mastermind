import { registry } from '@packages/core/PackageRegistry';
import type { PackageResize, PackageSpec } from '@packages/core/types';
import { itemAt, useDeckStore } from '@store/deckStore';

/** Largura/altura da caixa sem `height` fixa (o conteúdo do pacote define a altura). */
function setBox(element: Element, width: number | null, height: number | null): void {
  const el = element as HTMLElement;
  if (width !== null) el.style.width = `${Math.max(1, Math.round(width))}px`;
  if (height === null) el.style.removeProperty('height');
  else el.style.height = `${Math.max(1, Math.round(height))}px`;
}

/**
 * Pacote redimensionado com o mouse no palco. Com regras (`resize`), o pacote calcula o spec
 * novo e é redesenhado no tamanho; sem regras, a caixa só fica com a largura/altura soltas.
 */
export function resizePackage(path: number[], resize: PackageResize): void {
  const store = useDeckStore.getState();
  const index = path[0] ?? -1;
  const slide = itemAt(store.deck, index);
  if (!slide) return;
  const section = new DOMParser().parseFromString(slide.html, 'text/html').body.firstElementChild;
  let node: Element | null = section;
  for (const part of path.slice(1)) node = node?.children[part] ?? null;
  if (!section || !node) return;

  const id = node.getAttribute('data-pkg') ?? '';
  const def = registry.get(id);
  if (def?.resize) {
    let spec: PackageSpec = {};
    try {
      spec = JSON.parse(node.getAttribute('data-spec') ?? '{}') as PackageSpec;
    } catch {
      // spec ilegível: parte dos padrões
    }
    const next = {
      ...def.defaults,
      ...spec,
      ...def.resize.apply({ ...def.defaults, ...spec }, resize),
    };
    node.setAttribute('data-spec', JSON.stringify(next));
    try {
      node.innerHTML = registry.toHTML(id, next);
    } catch {
      return;
    }
    setBox(node, def.resize.width(next), null);
  } else {
    setBox(
      node,
      resize.edge === 's' ? null : resize.to.w,
      resize.edge === 'e' ? null : resize.to.h
    );
  }
  store.updateSlideHTML(index, section.outerHTML);
}
