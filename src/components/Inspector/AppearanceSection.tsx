import type { SelectionInfo } from '@packages/core/types';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { getActiveBridge } from '../../editor/bridgeRef';

import { mutateSelectedElement, readInlineStyle, readSelectedElement } from './elementSelection';

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-gold-DEFAULT/40';
const btnClass =
  'inline-flex items-center justify-center gap-1.5 rounded border border-payday-border px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:border-gold-DEFAULT/50 hover:bg-gold-DEFAULT/10 hover:text-gold-DEFAULT';

function toHex(color: string | undefined): string | null {
  const value = (color ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(value);
  if (!m) return null;
  return `#${[m[1], m[2], m[3]].map((p) => Number(p).toString(16).padStart(2, '0')).join('')}`;
}

/** Preenchimento, raio, opacidade, alinhamento e ordem de empilhamento. */
export function AppearanceSection({ selection }: { selection: SelectionInfo }) {
  const element = readSelectedElement(selection);
  if (!element || element.hasAttribute('data-pkg')) return null;
  const style = readInlineStyle(element);

  const setStyle = (property: string, value: string | null): void => {
    mutateSelectedElement(selection, (node) => {
      const css = (node as HTMLElement).style;
      if (value === null || value === '') css.removeProperty(property);
      else css.setProperty(property, value);
    });
  };

  const opacity = Math.round(
    (parseFloat(style.opacity ?? '1') || 0) * 100 || (style.opacity === '0' ? 0 : 100)
  );
  const radius = parseFloat(style['border-radius'] ?? '0') || 0;
  const align = style['text-align'] ?? '';

  return (
    <details className="group" open>
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-payday-textDim/50">
        Aparência
      </summary>
      <div className="space-y-3 px-3 pb-3 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Preenchimento">
            <input
              type="color"
              aria-label="Preenchimento"
              className="h-9 w-full cursor-pointer rounded border border-payday-border bg-payday-surface"
              value={toHex(style.background ?? style['background-color']) ?? '#ffffff'}
              onChange={(event) => setStyle('background', event.target.value)}
            />
          </Field>
          <Field label="Raio da borda">
            <input
              type="number"
              min={0}
              aria-label="Raio da borda"
              className={inputClass}
              value={radius}
              onChange={(event) => setStyle('border-radius', `${event.target.value || 0}px`)}
            />
          </Field>
        </div>
        <button type="button" className={btnClass} onClick={() => setStyle('background', null)}>
          Sem preenchimento
        </button>
        <Field label={`Opacidade · ${opacity}%`}>
          <input
            type="range"
            min={0}
            max={100}
            aria-label="Opacidade"
            className="accent-gold-DEFAULT"
            value={opacity}
            onChange={(event) => setStyle('opacity', (Number(event.target.value) / 100).toFixed(2))}
          />
        </Field>
        <div className="flex gap-1" role="group" aria-label="Alinhamento do texto">
          {(
            [
              ['left', 'Alinhar à esquerda', AlignLeft],
              ['center', 'Centralizar', AlignCenter],
              ['right', 'Alinhar à direita', AlignRight],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={align === value}
              className={`${btnClass} flex-1 ${align === value ? '!border-gold-DEFAULT/60 !bg-gold-DEFAULT/15 !text-gold-DEFAULT' : ''}`}
              onClick={() => setStyle('text-align', align === value ? null : value)}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            className={btnClass}
            onClick={() => getActiveBridge()?.command('front')}
          >
            <ArrowUpToLine className="h-3.5 w-3.5" /> Frente
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => getActiveBridge()?.command('back')}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" /> Trás
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => getActiveBridge()?.command('reset')}
          >
            <Undo2 className="h-3.5 w-3.5" /> Resetar
          </button>
        </div>
      </div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-payday-textDim/50">{label}</span>
      {children}
    </div>
  );
}
