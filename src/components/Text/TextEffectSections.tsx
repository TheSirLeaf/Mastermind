// components/Text/TextEffectSections.tsx
// Partes do painel de efeitos de texto: seção recolhível, linha de cor e as seções de contorno,
// sombra, reflexo e "mais" (o preenchimento fica no próprio painel).
import { clsx } from 'clsx';
import { ChevronRight, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  DEFAULT_REFLECT,
  SHADOW_PRESETS,
  type TextFx,
  type TextReflect,
  type TextShadow,
} from '../../editor/textFx';
import { ColorField } from '../common/ColorField';

import { iconBtn, REFLECT_UNSUPPORTED } from './effectsShared';
import { Segmented, Slider } from './TextControls';

export function Section({
  title,
  on,
  open,
  onToggle,
  children,
  testId,
}: {
  title: string;
  on: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="border-b border-white/5 last:border-0" data-testid={testId}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 py-2 text-left text-[10px] uppercase tracking-widest text-payday-textDim transition hover:text-payday-text"
      >
        <ChevronRight className={clsx('h-3 w-3 transition', open && 'rotate-90')} />
        <span className="flex-1">{title}</span>
        {on ? <span className="h-1.5 w-1.5 rounded-full bg-accent" title="Em uso" /> : null}
      </button>
      {open ? <div className="space-y-2 pb-3">{children}</div> : null}
    </div>
  );
}

export function ColorRow({
  label,
  color,
  opacity,
  onColor,
  onOpacity,
  avoid,
}: {
  label: string;
  color: string;
  opacity?: number | undefined;
  onColor: (c: string) => void;
  onOpacity?: ((o: number) => void) | undefined;
  avoid?: (() => DOMRect | null | undefined) | undefined;
}) {
  return (
    <div className="flex items-center gap-2">
      <ColorField compact value={color} ariaLabel={label} onChange={onColor} avoid={avoid} />
      {onOpacity && opacity !== undefined ? (
        <div className="flex-1">
          <Slider
            label="Opacidade"
            value={Math.round(opacity * 100)}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => onOpacity(v / 100)}
          />
        </div>
      ) : (
        <span className="text-[11px] text-payday-textDim">{label}</span>
      )}
    </div>
  );
}

type Avoid = (() => DOMRect | null | undefined) | undefined;

/** O que toda seção recebe do painel. */
export interface FxSectionProps {
  fx: TextFx;
  update: (mutate: (draft: TextFx) => void) => void;
  open: boolean;
  onToggle: () => void;
  avoid?: Avoid;
}

export function StrokeSection({ fx, update, open, onToggle, avoid }: FxSectionProps) {
  return (
    <Section title="Contorno" on={!!fx.stroke} open={open} onToggle={onToggle} testId="fx-stroke">
      <Segmented
        label="Contorno"
        value={fx.stroke ? (fx.stroke.outside ? 'out' : 'center') : 'none'}
        options={[
          ['none', 'Sem'],
          ['out', 'Por fora'],
          ['center', 'No meio'],
        ]}
        onChange={(v) =>
          update((d) => {
            if (v === 'none') d.stroke = null;
            else {
              d.stroke = d.stroke ?? { width: 3, color: '#10060B', opacity: 1, outside: true };
              d.stroke.outside = v === 'out';
            }
          })
        }
      />
      {fx.stroke ? (
        <>
          <Slider
            label="Espessura"
            value={fx.stroke.width}
            min={0.5}
            max={20}
            step={0.5}
            unit="px"
            onChange={(v) => update((d) => d.stroke && (d.stroke.width = v))}
          />
          <ColorRow
            label="Cor do contorno"
            color={fx.stroke.color}
            opacity={fx.stroke.opacity}
            onColor={(c) => update((d) => d.stroke && (d.stroke.color = c))}
            onOpacity={(o) => update((d) => d.stroke && (d.stroke.opacity = o))}
            avoid={avoid}
          />
        </>
      ) : null}
    </Section>
  );
}

export function ShadowSection({ fx, update, open, onToggle, avoid }: FxSectionProps) {
  const shadowFor = (index: number, mutate: (s: TextShadow) => void) =>
    update((d) => {
      const s = d.shadows[index];
      if (s) mutate(s);
    });
  return (
    <Section
      title="Sombra"
      on={fx.shadows.length > 0}
      open={open}
      onToggle={onToggle}
      testId="fx-shadow"
    >
      <div className="grid grid-cols-5 gap-1">
        {SHADOW_PRESETS.map(([id, label, make]) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              update(
                (d) =>
                  (d.shadows = make(
                    fx.fill?.kind === 'gradient'
                      ? (fx.fill.gradient.stops[0]?.color ?? '#F7D98B')
                      : (fx.fill?.color ?? '#F7D98B')
                  ))
              )
            }
            className="rounded border border-white/10 px-1 py-1 text-[10px] text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
          >
            {label}
          </button>
        ))}
      </div>
      {fx.shadows.map((s, i) => (
        <div
          key={i}
          className="space-y-1.5 rounded-md border border-white/10 p-2"
          data-testid="shadow-layer"
        >
          <div className="flex items-center justify-between text-[10px] text-payday-textDim">
            Camada {i + 1}
            <button
              type="button"
              aria-label={`Remover sombra ${i + 1}`}
              onClick={() => update((d) => d.shadows.splice(i, 1))}
              className={iconBtn}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <Slider
            label="X"
            value={s.x}
            min={-60}
            max={60}
            step={1}
            unit="px"
            onChange={(v) => shadowFor(i, (x) => (x.x = v))}
          />
          <Slider
            label="Y"
            value={s.y}
            min={-60}
            max={60}
            step={1}
            unit="px"
            onChange={(v) => shadowFor(i, (x) => (x.y = v))}
          />
          <Slider
            label="Desfoque"
            value={s.blur}
            min={0}
            max={120}
            step={1}
            unit="px"
            onChange={(v) => shadowFor(i, (x) => (x.blur = v))}
          />
          <Slider
            label="Tamanho"
            value={s.size ?? 0}
            min={0}
            max={40}
            step={0.5}
            unit="px"
            onChange={(v) => shadowFor(i, (x) => (x.size = v))}
          />
          <ColorRow
            label={`Cor da sombra ${i + 1}`}
            color={s.color}
            opacity={s.opacity}
            onColor={(c) => shadowFor(i, (x) => (x.color = c))}
            onOpacity={(o) => shadowFor(i, (x) => (x.opacity = o))}
            avoid={avoid}
          />
        </div>
      ))}
      {fx.shadows.length < 6 ? (
        <button
          type="button"
          onClick={() =>
            update((d) =>
              d.shadows.push({ x: 0, y: 6, blur: 16, size: 0, color: '#000000', opacity: 0.5 })
            )
          }
          className="flex items-center gap-1 text-[11px] text-payday-textMuted transition hover:text-accent"
        >
          <Plus className="h-3 w-3" /> Adicionar sombra
        </button>
      ) : null}
    </Section>
  );
}

export function ReflectSection({
  reflect,
  updateReflect,
  open,
  onToggle,
}: {
  reflect: TextReflect | null;
  updateReflect: (next: TextReflect | null) => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Section title="Reflexo" on={!!reflect} open={open} onToggle={onToggle} testId="fx-reflect">
      {REFLECT_UNSUPPORTED ? (
        <p className="mb-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[11px] leading-snug text-amber-200">
          Este navegador não desenha reflexos (o Firefox não tem esse recurso do CSS). O reflexo não
          é gravado aqui; aplique-o pelo Chrome ou Edge.
        </p>
      ) : null}
      <Segmented
        label="Lado do reflexo"
        value={reflect ? reflect.side : 'none'}
        options={[
          ['none', 'Sem'],
          ['below', 'Abaixo'],
          ['above', 'Acima'],
          ['left', 'Esq.'],
          ['right', 'Dir.'],
        ]}
        onChange={(side) =>
          updateReflect(side === 'none' ? null : { ...(reflect ?? DEFAULT_REFLECT), side })
        }
      />
      {reflect ? (
        <>
          <Slider
            label="Distância"
            value={reflect.gap}
            min={-40}
            max={80}
            step={1}
            unit="px"
            onChange={(v) => updateReflect({ ...reflect, gap: v })}
          />
          <Slider
            label="Força"
            value={Math.round(reflect.opacity * 100)}
            min={5}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => updateReflect({ ...reflect, opacity: v / 100 })}
          />
          <Slider
            label="Some em"
            value={reflect.fade}
            min={0}
            max={95}
            step={1}
            unit="%"
            onChange={(v) => updateReflect({ ...reflect, fade: v })}
          />
        </>
      ) : null}
      <p className="text-[10px] leading-snug text-payday-textDim">
        O reflexo vale para a caixa de texto toda.
      </p>
    </Section>
  );
}

export function MoreSection({
  fx,
  update,
  open,
  onToggle,
  avoid,
  inline,
}: FxSectionProps & { inline?: boolean | undefined }) {
  return (
    <Section
      title="Mais"
      on={
        !!fx.highlight ||
        Math.abs(fx.spacing) > 0.001 ||
        fx.transform !== 'none' ||
        fx.opacity < 0.999
      }
      open={open}
      onToggle={onToggle}
      testId="fx-more"
    >
      {inline ? (
        <Slider
          label="Letras"
          value={fx.spacing}
          min={-0.1}
          max={0.6}
          step={0.01}
          unit="em"
          onChange={(v) => update((d) => (d.spacing = v))}
        />
      ) : null}
      <Segmented
        label="Maiúsculas e minúsculas"
        value={fx.transform}
        options={[
          ['none', 'Como está'],
          ['uppercase', 'AA'],
          ['lowercase', 'aa'],
          ['capitalize', 'Aa'],
        ]}
        onChange={(v) => update((d) => (d.transform = v))}
      />
      {inline ? (
        <>
          <Slider
            label="Opacidade"
            value={Math.round(fx.opacity * 100)}
            min={5}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => update((d) => (d.opacity = v / 100))}
          />
          <label className="flex items-center justify-between text-[11px] text-payday-text">
            Marca-texto
            <input
              type="checkbox"
              aria-label="Marca-texto"
              checked={!!fx.highlight}
              onChange={(event) =>
                update(
                  (d) =>
                    (d.highlight = event.target.checked
                      ? { color: '#F7D98B', opacity: 0.35, radius: 0.15, pad: 0.15 }
                      : null)
                )
              }
              className="h-4 w-4 accent-[#C77C8A]"
            />
          </label>
          {fx.highlight ? (
            <>
              <ColorRow
                label="Cor do marca-texto"
                color={fx.highlight.color}
                opacity={fx.highlight.opacity}
                onColor={(c) => update((d) => d.highlight && (d.highlight.color = c))}
                onOpacity={(o) => update((d) => d.highlight && (d.highlight.opacity = o))}
                avoid={avoid}
              />
              <Slider
                label="Cantos"
                value={fx.highlight.radius}
                min={0}
                max={0.6}
                step={0.01}
                unit="em"
                onChange={(v) => update((d) => d.highlight && (d.highlight.radius = v))}
              />
              <Slider
                label="Folga"
                value={fx.highlight.pad}
                min={0}
                max={0.6}
                step={0.01}
                unit="em"
                onChange={(v) => update((d) => d.highlight && (d.highlight.pad = v))}
              />
            </>
          ) : null}
        </>
      ) : null}
    </Section>
  );
}
