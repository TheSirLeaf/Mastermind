// editor/elementFx.ts
// Efeitos de texto aplicados à caixa de texto inteira (inspetor) e o brilho que passa (aba
// Animação).
import type { ElementPatch } from '@packages/core/animation';
import type { SelectionInfo } from '@packages/core/types';

import { mutateSelectedElement } from '../components/Inspector/elementSelection';

import {
  isEmptyFx,
  parseTextFx,
  reflectToCss,
  shineVars,
  textFxToCss,
  type TextFx,
  type TextReflect,
  type TextShine,
} from './textFx';

/** Na caixa toda, folga/margem, marca-texto, opacidade e espaço entre letras são da caixa. */
const BOX_OWNED = new Set([
  'padding',
  'margin',
  'box-shadow',
  'border-radius',
  '-webkit-box-decoration-break',
  'box-decoration-break',
  'opacity',
  'letter-spacing',
]);

/** Variáveis do brilho (não pertencem aos efeitos quando o brilho é o da aba Animação). */
const SHINE_VARS = [
  '--mm-shine-c',
  '--mm-shine-t',
  '--mm-shine-w',
  '--mm-shine-a',
  '--mm-shine-d',
  '--mm-shine-p0',
  '--mm-shine-p1',
];

export function applyElementFx(selection: SelectionInfo, fx: TextFx): void {
  mutateSelectedElement(selection, (node) => {
    const el = node as HTMLElement;
    // Só mexe no que mudou em relação aos efeitos anteriores: estilos que o elemento já tinha
    // por outros caminhos (cor do tema, sombra do modelo…) não são apagados de tabela.
    const before = textFxToCss(parseTextFx(el.getAttribute('data-fx')));
    const after = textFxToCss(fx);
    const hasShine = el.hasAttribute('data-shine');
    for (const [prop, value] of Object.entries(after)) {
      if (BOX_OWNED.has(prop) || before[prop] === value) continue;
      if (hasShine && SHINE_VARS.includes(prop)) continue;
      if (value === null) el.style.removeProperty(prop);
      else el.style.setProperty(prop, value);
    }
    el.classList.toggle('mm-shine', hasShine || fx.fill?.kind === 'shine');
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

/** Patch que liga/ajusta (ou desliga, com `null`) o brilho que passa pelo texto do elemento. */
export function shinePatch(shine: TextShine | null): ElementPatch {
  const style: Record<string, string | null> = {};
  for (const name of SHINE_VARS) style[name] = null;
  if (!shine) return { attrs: { 'data-shine': null }, style, classes: { remove: ['mm-shine'] } };
  Object.assign(style, shineVars(shine));
  return {
    attrs: { 'data-shine': JSON.stringify(shine) },
    style,
    classes: { add: ['mm-shine'] },
  };
}
