import { registry } from '@packages/core/PackageRegistry';
import type { SelectionInfo } from '@packages/core/types';

import { mutateSelectedElement } from './elementSelection';

export function getElementSpec(element: Element | null): Record<string, unknown> {
  const specAttr = element?.getAttribute('data-spec');
  if (!specAttr) return {};
  try {
    const parsed: unknown = JSON.parse(specAttr);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Grava o novo `data-spec` e redesenha o conteúdo do elemento com o `render`
 * do pacote — sem isso o formulário mudava só o atributo e o slide não reagia.
 */
export function updatePackageSpec(
  selection: Pick<SelectionInfo, 'path'> & Partial<SelectionInfo>,
  newSpec: Record<string, unknown>
): void {
  mutateSelectedElement({ tag: 'div', label: '', ...selection } as SelectionInfo, (element) => {
    element.setAttribute('data-spec', JSON.stringify(newSpec));
    const id = element.getAttribute('data-pkg');
    if (!id || !registry.has(id)) return;
    try {
      element.innerHTML = registry.toHTML(id, newSpec);
    } catch {
      // Spec inválida no meio da edição: mantém o último desenho válido.
    }
  });
}
