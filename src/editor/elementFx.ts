// editor/elementFx.ts
// Efeitos de texto aplicados à caixa de texto inteira (inspetor).
import type { SelectionInfo } from '@packages/core/types';

import { mutateSelectedElement } from '../components/Inspector/elementSelection';

import { isEmptyFx, reflectToCss, textFxToCss, type TextFx, type TextReflect } from './textFx';

/** Na caixa toda, folga/margem, marca-texto e opacidade não são dos efeitos (são da caixa). */
const BOX_OWNED = new Set([
  'padding',
  'margin',
  'box-shadow',
  'border-radius',
  '-webkit-box-decoration-break',
  'box-decoration-break',
  'opacity',
]);

export function applyElementFx(selection: SelectionInfo, fx: TextFx): void {
  mutateSelectedElement(selection, (node) => {
    const el = node as HTMLElement;
    for (const [prop, value] of Object.entries(textFxToCss(fx))) {
      if (BOX_OWNED.has(prop)) continue;
      if (value === null) el.style.removeProperty(prop);
      else el.style.setProperty(prop, value);
    }
    el.classList.toggle('mm-shine', fx.fill?.kind === 'shine');
    if (!el.classList.length) el.removeAttribute('class');
    if (isEmptyFx(fx)) el.removeAttribute('data-fx');
    else el.setAttribute('data-fx', JSON.stringify({ ...fx, highlight: null, opacity: 1 }));
  });
}

export function applyElementReflect(selection: SelectionInfo, reflect: TextReflect | null): void {
  mutateSelectedElement(selection, (node) => {
    const el = node as HTMLElement;
    const css = reflectToCss(reflect);
    if (css) el.style.setProperty('-webkit-box-reflect', css);
    else el.style.removeProperty('-webkit-box-reflect');
    if (reflect) el.setAttribute('data-reflect', JSON.stringify(reflect));
    else el.removeAttribute('data-reflect');
  });
}
