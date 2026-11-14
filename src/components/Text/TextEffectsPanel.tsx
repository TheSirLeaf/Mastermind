// Painel de efeitos de texto: preenchimento (cor, gradiente com várias cores, brilho animado),
// contorno, sombras em camadas, marca-texto, espaçamento, maiúsculas, opacidade e reflexo.
// Serve tanto para um trecho (barra flutuante) quanto para a caixa toda (inspetor).
import { clsx } from 'clsx';
import { ChevronRight, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import {
  DEFAULT_FILL,
  DEFAULT_REFLECT,
  gradientCss,
  SHADOW_PRESETS,
  type TextFill,
  type TextFx,
  type TextReflect,
  type TextShadow,
} from '../../editor/textFx';
import { ColorField } from '../common/ColorField';

import { Segmented, Slider } from './TextControls';

const GRADIENT_PRESETS: string[][] = [
  ['#F7D98B', '#C77C8A'],
  ['#FFF8F5', '#D6A84F'],
  ['#8FB8D8', '#8B5CF6'],
  ['#22C55E', '#06B6D4'],
  ['#F97316', '#EC4899'],
  ['#FFFFFF', '#737373'],
  ['#F7D98B', '#FFF8F5', '#C77C8A'],
  ['#EF4444', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'],
];

const clone = <T,>(v: T): T => structuredClone(v);

function Section({
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

function ColorRow({
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

const iconBtn =
  'flex h-6 w-6 items-center justify-center rounded text-payday-textMuted transition hover:bg-white/5 hover:text-accent';

export interface TextEffectsPanelProps {
  fx: TextFx;
  onFx: (fx: TextFx) => void;
  reflect: TextReflect | null;
  onReflect: (reflect: TextReflect | null) => void;
  /** Marca-texto e opacidade só fazem sentido num trecho. */
  inline?: boolean | undefined;
  /** Área que os seletores de cor não devem cobrir. */
  avoid?: (() => DOMRect | null | undefined) | undefined;
}

export function TextEffectsPanel({
  fx: incoming,
  onFx,
  reflect: incomingReflect,
  onReflect,
  inline,
  avoid,
}: TextEffectsPanelProps) {
  // Cópia local: a interface responde na hora; a de fora só substitui quando muda de verdade
  // (outro trecho selecionado, desfazer…).
  const [fx, setFx] = useState(incoming);
  const [reflect, setReflect] = useState(incomingReflect);
  const sentFx = useRef(JSON.stringify(incoming));
  const sentReflect = useRef(JSON.stringify(incomingReflect));
  useEffect(() => {
    const key = JSON.stringify(incoming);
    if (key !== sentFx.current) {
      sentFx.current = key;
      setFx(incoming);
    }
  }, [incoming]);
  useEffect(() => {
    const key = JSON.stringify(incomingReflect);
    if (key !== sentReflect.current) {
      sentReflect.current = key;
      setReflect(incomingReflect);
    }
  }, [incomingReflect]);

  const [open, setOpen] = useState<Record<string, boolean>>({ fill: true });
  // Acordeão: abrir uma seção fecha as outras (o painel cabe na tela).
  const toggle = (id: string) => setOpen((o) => ({ [id]: !o[id] }));

  const update = (mutate: (draft: TextFx) => void) => {
    const next = clone(fx);
    mutate(next);
    setFx(next);
    sentFx.current = JSON.stringify(next);
    onFx(next);
  };
  const updateReflect = (next: TextReflect | null) => {
    setReflect(next);
    sentReflect.current = JSON.stringify(next);
    onReflect(next);
  };
  const fill = (mutate: (f: TextFill) => void) =>
    update((d) => {
      d.fill = d.fill ?? clone(DEFAULT_FILL);
      mutate(d.fill);
    });

  const fillKind = fx.fill ? fx.fill.kind : 'none';
  const g = fx.fill?.gradient ?? DEFAULT_FILL.gradient;
  const shadowFor = (index: number, mutate: (s: TextShadow) => void) =>
    update((d) => {
      const s = d.shadows[index];
      if (s) mutate(s);
    });

  return (
    <div className="px-1" data-testid="text-advanced">
      <Section
        title="Preenchimento"
        on={!!fx.fill}
        open={!!open.fill}
        onToggle={() => toggle('fill')}
        testId="fx-fill"
      >
        <Segmented
          label="Tipo de preenchimento"
          value={fillKind}
          options={[
            ['none', 'Padrão'],
            ['solid', 'Cor'],
            ['gradient', 'Gradiente'],
          ]}
          onChange={(kind) =>
            update((d) => {
              if (kind === 'none') d.fill = null;
              else {
                d.fill = d.fill ?? clone(DEFAULT_FILL);
                d.fill.kind = kind;
              }
            })
          }
        />
        {fx.fill?.kind === 'solid' || fx.fill?.kind === 'shine' ? (
          <ColorRow
            label={fx.fill.kind === 'shine' ? 'Cor de base' : 'Cor do texto'}
            color={fx.fill.color}
            opacity={fx.fill.opacity}
            onColor={(c) => fill((f) => (f.color = c))}
            onOpacity={(o) => fill((f) => (f.opacity = o))}
            avoid={avoid}
          />
        ) : null}
        {fx.fill?.kind === 'gradient' ? (
          <div className="space-y-2">
            <div
              className="h-5 rounded border border-white/15"
              style={{ background: gradientCss({ ...g, type: 'linear', angle: 90 }) }}
            />
            <div className="grid grid-cols-8 gap-1">
              {GRADIENT_PRESETS.map((colors) => (
                <button
                  key={colors.join()}
                  type="button"
                  aria-label={`Gradiente ${colors.join(' → ')}`}
                  title={colors.join(' → ')}
                  onClick={() =>
                    fill((f) => {
                      f.gradient.stops = colors.map((color, i) => ({
                        color,
                        at: Math.round((i / (colors.length - 1)) * 100),
                      }));
                    })
                  }
                  className="h-5 rounded border border-white/15 transition hover:scale-110"
                  style={{ background: `linear-gradient(90deg, ${colors.join(', ')})` }}
                />
              ))}
            </div>
            <Segmented
              label="Forma do gradiente"
              value={g.type}
              options={[
                ['linear', 'Linear'],
                ['radial', 'Radial'],
              ]}
              onChange={(type) => fill((f) => (f.gradient.type = type))}
            />
            {g.type === 'linear' ? (
              <Slider
                label="Ângulo"
                value={g.angle}
                min={0}
                max={360}
                step={1}
                unit="°"
                onChange={(v) => fill((f) => (f.gradient.angle = v))}
              />
            ) : null}
            {g.stops.map((stop, i) => (
              <div key={i} className="flex items-center gap-2" data-testid="gradient-stop">
                <ColorField
                  compact
                  value={stop.color}
                  ariaLabel={`Cor ${i + 1} do gradiente`}
                  avoid={avoid}
                  onChange={(c) => fill((f) => (f.gradient.stops[i]!.color = c))}
                />
                <div className="flex-1">
                  <Slider
                    label="Posição"
                    value={stop.at}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(v) => fill((f) => (f.gradient.stops[i]!.at = v))}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remover cor ${i + 1}`}
                  disabled={g.stops.length <= 2}
                  onClick={() => fill((f) => f.gradient.stops.splice(i, 1))}
                  className={clsx(iconBtn, 'disabled:opacity-30')}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {g.stops.length < 6 ? (
              <button
                type="button"
                onClick={() =>
                  fill((f) => {
                    // A nova cor entra no fim e todas se redistribuem por igual.
                    const stops = [...f.gradient.stops].sort((a, b) => a.at - b.at);
                    stops.push({ color: stops[stops.length - 1]?.color ?? '#FFFFFF', at: 100 });
                    f.gradient.stops = stops.map((st, i) => ({
                      ...st,
                      at: Math.round((i / (stops.length - 1)) * 100),
                    }));
                  })
                }
                className="flex items-center gap-1 text-[11px] text-payday-textMuted transition hover:text-accent"
              >
                <Plus className="h-3 w-3" /> Adicionar cor
              </button>
            ) : null}
          </div>
        ) : null}
        {fx.fill?.kind === 'shine' ? (
          <p className="text-[10px] leading-snug text-payday-textDim">
            Este trecho usa o brilho antigo. O brilho que passa agora fica na aba Animação (vale
            para a caixa de texto e aparece na linha do tempo).
          </p>
        ) : null}
      </Section>

      <Section
        title="Contorno"
        on={!!fx.stroke}
        open={!!open.stroke}
        onToggle={() => toggle('stroke')}
        testId="fx-stroke"
      >
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

      <Section
        title="Sombra"
        on={fx.shadows.length > 0}
        open={!!open.shadow}
        onToggle={() => toggle('shadow')}
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

      <Section
        title="Reflexo"
        on={!!reflect}
        open={!!open.reflect}
        onToggle={() => toggle('reflect')}
        testId="fx-reflect"
      >
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

      <Section
        title="Mais"
        on={
          !!fx.highlight ||
          Math.abs(fx.spacing) > 0.001 ||
          fx.transform !== 'none' ||
          fx.opacity < 0.999
        }
        open={!!open.more}
        onToggle={() => toggle('more')}
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
    </div>
  );
}
