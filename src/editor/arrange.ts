// editor/arrange.ts
// Ações de organização do elemento selecionado (camadas, alinhamento, pai/filho, trava).
import type { SelectionInfo } from '@packages/core/types';

import { mutateSelectedElement } from '../components/Inspector/elementSelection';

import { getActiveBridge } from './bridgeRef';

export type LayerMove = 'forward' | 'backward' | 'front' | 'back';
export type AlignH = 'left' | 'center' | 'right' | null;
export type AlignV = 'top' | 'middle' | 'bottom' | null;

export function moveLayer(dir: LayerMove): void {
  getActiveBridge()?.command(dir);
}

export function alignToSlide(h: AlignH, v: AlignV): void {
  getActiveBridge()?.command('align', { h, v });
}

/** Próximo clique no palco escolhe o pai do elemento selecionado. */
export function pickParent(): void {
  getActiveBridge()?.command('set-parent');
}

export function releaseFromParent(): void {
  getActiveBridge()?.command('unparent');
}

export function cancelPickParent(): void {
  getActiveBridge()?.command('cancel-pick');
}

export function toggleLock(selection: SelectionInfo | null): void {
  if (!selection) return;
  mutateSelectedElement(selection, (node) => {
    const style = (node as HTMLElement).style;
    if (style.pointerEvents === 'none') style.removeProperty('pointer-events');
    else style.setProperty('pointer-events', 'none');
  });
}
