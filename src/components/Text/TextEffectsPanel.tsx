// Painel de efeitos de texto: preenchimento (cor, gradiente com várias cores, brilho animado),
// contorno, sombras em camadas, marca-texto, espaçamento, maiúsculas, opacidade e reflexo.
// Serve tanto para um trecho (barra flutuante) quanto para a caixa toda (inspetor).
import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  DEFAULT_FILL,
  gradientCss,
  type TextFill,
  type TextFx,
  type TextReflect,
} from '../../editor/textFx';
import { ColorField } from '../common/ColorField';

import { clone, GRADIENT_PRESETS, iconBtn } from './effectsShared';
import { Segmented, Slider } from './TextControls';
import {
  ColorRow,
  MoreSection,
  ReflectSection,
  Section,
  ShadowSection,
  StrokeSection,
} from './TextEffectSections';

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

      <StrokeSection
        fx={fx}
        update={update}
        open={!!open.stroke}
        onToggle={() => toggle('stroke')}
        avoid={avoid}
      />
      <ShadowSection
        fx={fx}
        update={update}
        open={!!open.shadow}
        onToggle={() => toggle('shadow')}
        avoid={avoid}
      />
      <ReflectSection
        reflect={reflect}
        updateReflect={updateReflect}
        open={!!open.reflect}
        onToggle={() => toggle('reflect')}
      />
      <MoreSection
        fx={fx}
        update={update}
        open={!!open.more}
        onToggle={() => toggle('more')}
        avoid={avoid}
        inline={inline}
      />
    </div>
  );
}
