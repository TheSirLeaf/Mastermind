// components/Inspector/StyleTab.tsx
import type { SelectionInfo } from '@packages/core/types';
import type { ReactNode } from 'react';

import { mutateSelectedElement, readInlineStyle, readSelectedElement } from './elementSelection';

export function StyleTab({ selection }: { selection: SelectionInfo }) {
  const element = readSelectedElement(selection);
  const current = readInlineStyle(element);

  if (!element) {
    return (
      <div className="rounded border border-white/10 p-3 text-[11px] text-[#F3E6E2]/60">
        Elemento não encontrado no slide atual.
      </div>
    );
  }

  const setStyle = (property: string, value: string | null): void => {
    mutateSelectedElement(selection, (node) => {
      const style = (node as HTMLElement).style;
      if (value === null || value === '') style.removeProperty(property);
      else style.setProperty(property, value);
    });
  };

  const numberValue = (value: string | undefined): number => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return (
    <div className="space-y-4">
      <details className="group open">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-[#F3E6E2]/60">
          <Icon path="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3-3M2 12h20M12 2v20" />
          Posição e tamanho
        </summary>
        <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-2">
          <Field label="X">
            <input
              type="number"
              className={inputClass}
              value={numberValue(current.left)}
              onChange={(event) => setStyle('left', `${event.target.value}px`)}
            />
          </Field>
          <Field label="Y">
            <input
              type="number"
              className={inputClass}
              value={numberValue(current.top)}
              onChange={(event) => setStyle('top', `${event.target.value}px`)}
            />
          </Field>
          <Field label="Largura">
            <input
              type="number"
              className={inputClass}
              value={numberValue(current.width)}
              onChange={(event) => setStyle('width', `${event.target.value}px`)}
            />
          </Field>
          <Field label="Altura">
            <input
              type="number"
              className={inputClass}
              value={numberValue(current.height)}
              onChange={(event) => setStyle('height', `${event.target.value}px`)}
            />
          </Field>
        </div>
      </details>

      <details className="group open">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-[#F3E6E2]/60">
          <Icon path="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          Visibilidade
        </summary>
        <div className="space-y-2 px-3 pb-3 pt-2">
          <Toggle
            label="Visível"
            checked={current.display !== 'none'}
            onChange={(checked) => setStyle('display', checked ? null : 'none')}
          />
          <Toggle
            label="Travado (sem interação)"
            checked={current.pointerEvents === 'none'}
            onChange={(checked) => setStyle('pointerEvents', checked ? 'none' : null)}
          />
        </div>
      </details>

      <details className="group open">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-[#F3E6E2]/60">
          <Icon path="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
          Tipografia
        </summary>
        <div className="space-y-2 px-3 pb-3 pt-2">
          <Field label="Cor">
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded border border-white/10 bg-black/20"
              value={toHex(current.color) ?? '#f3e6e2'}
              onChange={(event) => setStyle('color', event.target.value)}
            />
          </Field>
          <Field label="Tamanho">
            <input
              type="number"
              className={inputClass}
              value={numberValue(current.fontSize)}
              onChange={(event) => setStyle('fontSize', `${event.target.value}px`)}
            />
          </Field>
        </div>
      </details>

      <div className="rounded border border-white/10 p-3 text-[11px] leading-relaxed text-[#F3E6E2]/40">
        Estilos inline são persistidos no HTML do slide e entram no undo/redo.
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-[#F3E6E2] outline-none focus:border-[#F7D98B]/40';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-[#F3E6E2]/50">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#F3E6E2]">
      <input
        type="checkbox"
        className="accent-[#F7D98B]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      className="h-4 w-4 text-[#F7D98B]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d={path} />
    </svg>
  );
}

function toHex(color: string | undefined): string | null {
  if (!color) return null;
  const value = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  const [, r, g, b] = match;
  if (r === undefined || g === undefined || b === undefined) return null;
  return `#${[r, g, b].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
}
