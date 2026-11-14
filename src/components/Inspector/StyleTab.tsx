// components/Inspector/StyleTab.tsx
import { ColorField } from '@components/common/ColorField';
import type { SelectionInfo } from '@packages/core/types';
import type { ReactNode } from 'react';

import { applyElementFx, applyElementReflect } from '../../editor/elementFx';
import { DEFAULT_FILL, parseReflect, parseTextFx } from '../../editor/textFx';
import { FontPicker, SizeStepper } from '../Text/TextControls';
import { TextEffectsPanel } from '../Text/TextEffectsPanel';

import { AppearanceSection } from './AppearanceSection';
import {
  mutateSelectedElement,
  readInlineStyle,
  readSelectedElement,
  stageComputedStyle,
} from './elementSelection';
import { InspectorSection } from './InspectorSection';

export function StyleTab({ selection }: { selection: SelectionInfo }) {
  const element = readSelectedElement(selection);
  const current = readInlineStyle(element);

  if (!element) {
    return (
      <div className="rounded border border-payday-border p-3 text-[11px] text-payday-textDim/50">
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

  const x = parseLength(current.left);
  const y = parseLength(current.top);
  const width = parseLength(current.width);
  const height = parseLength(current.height);
  const fontSize = parseLength(current['font-size']);
  const letterSpacing = parseLength(current['letter-spacing'], 'em');
  const fontFamily = current['font-family'] ?? '';
  const fx = parseTextFx(element.getAttribute('data-fx'));
  const reflect = parseReflect(element.getAttribute('data-reflect'));
  // Sem tamanho próprio: o − / + parte do tamanho herdado (classe do slide).
  const computedSize = Math.round(
    Number.parseFloat(stageComputedStyle(selection)?.fontSize ?? '') || 40
  );
  const fontWeight = current['font-weight'] ?? '';
  const bold = fontWeight === 'bold' || Number.parseInt(fontWeight, 10) >= 600;
  const italic = current['font-style'] === 'italic';
  const underline = (current['text-decoration'] ?? '').includes('underline');

  return (
    <div>
      <InspectorSection
        id="pos"
        group="style"
        title="Posição e tamanho"
        icon={<Icon path="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3-3M2 12h20M12 2v20" />}
        defaultOpen
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="X">
            <input
              type="number"
              aria-label="X"
              className={inputClass}
              value={x.value}
              onChange={(event) => setStyle('left', `${event.target.value}${x.unit}`)}
            />
          </Field>
          <Field label="Y">
            <input
              type="number"
              aria-label="Y"
              className={inputClass}
              value={y.value}
              onChange={(event) => setStyle('top', `${event.target.value}${y.unit}`)}
            />
          </Field>
          <Field label="Largura">
            <input
              type="number"
              aria-label="Largura"
              className={inputClass}
              value={width.value}
              onChange={(event) => setStyle('width', `${event.target.value}${width.unit}`)}
            />
          </Field>
          <Field label="Altura">
            <input
              type="number"
              aria-label="Altura"
              className={inputClass}
              value={height.value}
              onChange={(event) => setStyle('height', `${event.target.value}${height.unit}`)}
            />
          </Field>
        </div>
      </InspectorSection>

      <InspectorSection
        id="vis"
        group="style"
        title="Visibilidade e trava"
        icon={
          <Icon path="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        }
      >
        <div className="space-y-2">
          <Toggle
            label="Visível"
            checked={current.display !== 'none'}
            onChange={(checked) => setStyle('display', checked ? null : 'none')}
          />
          <Toggle
            label="Travado"
            checked={current['pointer-events'] === 'none'}
            onChange={(checked) => setStyle('pointer-events', checked ? 'none' : null)}
          />
        </div>
      </InspectorSection>

      <InspectorSection
        id="typo"
        group="style"
        title="Tipografia"
        icon={
          <Icon path="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        }
      >
        <div className="space-y-2">
          <Field label="Cor">
            <ColorField
              ariaLabel="Cor do texto"
              value={
                fx.fill?.kind === 'solid' ? fx.fill.color : (toHex(current.color) ?? '#ffffff')
              }
              onChange={(hex) =>
                applyElementFx(selection, {
                  ...fx,
                  fill: {
                    ...(fx.fill ?? structuredClone(DEFAULT_FILL)),
                    kind: 'solid',
                    color: hex,
                  },
                })
              }
            />
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field label="Família">
              <FontPicker
                block
                emptyLabel="Padrão do slide"
                font={fontFamily}
                onPick={(value) => setStyle('font-family', value || null)}
              />
            </Field>
            <Field label="Tamanho">
              <div className="w-[104px]">
                <SizeStepper
                  label="Tamanho da fonte"
                  size={fontSize.value || computedSize}
                  onSet={(px) => setStyle('font-size', `${px}${fontSize.unit}`)}
                  onStep={(delta) => {
                    // px e %: de 1 em 1; em/rem: de 0,05 em 0,05.
                    const unitStep = /^r?em$/.test(fontSize.unit) ? 0.05 : 1;
                    const base = fontSize.value || computedSize;
                    const next = Math.round((base + delta * unitStep) * 1000) / 1000;
                    setStyle('font-size', `${Math.max(unitStep, next)}${fontSize.unit}`);
                  }}
                />
              </div>
            </Field>
          </div>
          <div className="flex items-center gap-1">
            <FormatButton
              label="Negrito"
              active={bold}
              onClick={() => setStyle('font-weight', bold ? null : '700')}
            >
              B
            </FormatButton>
            <FormatButton
              label="Itálico"
              active={italic}
              onClick={() => setStyle('font-style', italic ? null : 'italic')}
            >
              I
            </FormatButton>
            <FormatButton
              label="Sublinhado"
              active={underline}
              onClick={() => setStyle('text-decoration', underline ? null : 'underline')}
            >
              U
            </FormatButton>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Espaço entre linhas">
              <input
                type="number"
                aria-label="Espaço entre linhas"
                step="0.1"
                className={inputClass}
                value={current['line-height'] ?? ''}
                onChange={(event) => setStyle('line-height', event.target.value)}
              />
            </Field>
            <Field label="Espaço entre letras">
              <input
                type="number"
                aria-label="Espaço entre letras"
                step="0.01"
                className={inputClass}
                value={letterSpacing.value}
                onChange={(event) =>
                  setStyle('letter-spacing', `${event.target.value}${letterSpacing.unit}`)
                }
              />
            </Field>
          </div>
        </div>
      </InspectorSection>
      <InspectorSection
        id="textfx"
        group="style"
        title="Efeitos de texto"
        icon={
          <Icon path="M12 3l1.9 5.8L20 10l-5 3.6L16.5 20 12 16.4 7.5 20 9 13.6 4 10l6.1-1.2z" />
        }
      >
        <TextEffectsPanel
          fx={fx}
          onFx={(next) => applyElementFx(selection, next)}
          reflect={reflect}
          onReflect={(next) => applyElementReflect(selection, next)}
        />
      </InspectorSection>
      <AppearanceSection selection={selection} />
    </div>
  );
}

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-accent/40';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-payday-textDim/50">{label}</label>
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
    <label className="flex cursor-pointer items-center gap-2 text-sm text-payday-text">
      <input
        type="checkbox"
        className="accent-accent"
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
      className="h-4 w-4 text-accent"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d={path} />
    </svg>
  );
}

function FormatButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 w-8 rounded border text-xs font-semibold transition ${
        active
          ? 'border-accent/60 bg-accent/15 text-accent'
          : 'border-payday-border text-payday-textMuted hover:border-white/25 hover:text-payday-text'
      }`}
    >
      {children}
    </button>
  );
}

function parseLength(
  value: string | undefined,
  fallbackUnit = 'px'
): { value: number; unit: string } {
  const trimmed = (value ?? '').trim();
  const match = /^(-?\d+(?:\.\d+)?)\s*([a-z%]*)$/i.exec(trimmed);
  const number = match?.[1];
  if (!number) return { value: 0, unit: fallbackUnit };
  const unit = match?.[2] || fallbackUnit;
  return { value: Number(number), unit };
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
