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
import { InspectorSection } from './InspectorSection';

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-accent/40';
const btnClass =
  'inline-flex items-center justify-center gap-1.5 rounded border border-payday-border px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:border-accent/50 hover:bg-accent/10 hover:text-accent';

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
    <InspectorSection
      id="look"
      group="style"
      title="Aparência"
      icon={
        <svg
          className="h-4 w-4 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="13.5" cy="6.5" r="1.5" />
          <circle cx="17.5" cy="10.5" r="1.5" />
          <circle cx="8.5" cy="7.5" r="1.5" />
          <circle cx="6.5" cy="12.5" r="1.5" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" />
        </svg>
      }
    >
      <div className="space-y-3">
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
            className="accent-accent"
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
              className={`${btnClass} flex-1 ${align === value ? '!border-accent/60 !bg-accent/15 !text-accent' : ''}`}
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
    </InspectorSection>
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
