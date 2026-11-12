// components/Inspector/AnimationTab.tsx

import {
  ANIMATION_DEFAULTS,
  ANIMATION_DIRECTIONS,
  ANIMATION_KINDS,
  ANIMATION_PRESETS,
  animationDuration,
  animationPatch,
  readAnimation,
  type AnimationDirection,
  type AnimationKind,
  type ElementAnimation,
} from '@packages/core/animation';
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { readSelectedElement } from './elementSelection';
import { InspectorSection } from './InspectorSection';

const KIND_LABELS: Record<AnimationKind, string> = {
  rise: 'Subir',
  fade: 'Fade',
  slide: 'Deslizar',
  zoom: 'Zoom',
  blur: 'Desfoque',
  flip: 'Flip',
};

const DIRECTION_LABELS: Record<AnimationDirection, string> = {
  up: 'Cima',
  down: 'Baixo',
  left: 'Esquerda',
  right: 'Direita',
};

const EASING_OPTIONS = [
  { value: 'cubic-bezier(.16,.84,.24,1)', label: 'Suave (padrão)' },
  { value: 'ease-out', label: 'Saída rápida' },
  { value: 'ease-in-out', label: 'Entrada e saída' },
  { value: 'linear', label: 'Linear' },
  { value: 'cubic-bezier(.2,1.3,.35,1)', label: 'Elástico' },
];

export function AnimationTab({ selection }: { selection: SelectionInfo }) {
  const deck = useDeckStore((state) => state.deck);
  const path = selection.path;
  const pathKey = path.join('.');
  const slideIndex = path[0];
  const slide = typeof slideIndex === 'number' ? deck.slides[slideIndex] : undefined;
  const html = slide?.html ?? '';
  const selectedElement = readSelectedElement(selection);
  const current = selectedElement ? readAnimation(selectedElement) : null;

  const [draft, setDraft] = useState<ElementAnimation>(current ?? ANIMATION_DEFAULTS);
  const [enabled, setEnabled] = useState(current !== null);

  useEffect(() => {
    const element = readSelectedElement(selection);
    const read = element ? readAnimation(element) : null;
    setDraft(read ?? ANIMATION_DEFAULTS);
    setEnabled(read !== null);
  }, [path, pathKey, html, selection]);

  if (!slide) {
    return <Hint>Slide não encontrado.</Hint>;
  }

  const isSection = selection.tag.toLowerCase() === 'section';
  if (isSection) {
    return (
      <Hint>
        Selecione um elemento dentro do slide. A animação de entrada é aplicada a elementos, não à
        seção inteira.
      </Hint>
    );
  }

  const apply = (animation: ElementAnimation | null): void => {
    useDeckStore.getState().patchElement(path, animationPatch(animation));
    if (animation) {
      setDraft(animation);
      setEnabled(true);
    } else {
      setEnabled(false);
    }
  };

  const update = (patch: Partial<ElementAnimation>): void => {
    const next = { ...draft, ...patch };
    setDraft(next);
    apply(next);
  };

  const applyPreset = (animation: ElementAnimation): void => {
    setDraft(animation);
    setEnabled(true);
    apply(animation);
    replaySoon();
  };

  const replaySoon = (): void => {
    window.setTimeout(() => useUIStore.getState().replayAnimations(), 60);
  };

  const copyToSiblings = (): void => {
    if (!enabled || !selectedElement) return;
    const parent = selectedElement.parentElement;
    if (!parent || path.length < 2) return;
    const parentPath = path.slice(0, -1);
    const ownIndex = path[path.length - 1];
    const patch = animationPatch(draft);
    for (let index = 0; index < parent.children.length; index += 1) {
      if (index === ownIndex) continue;
      useDeckStore.getState().patchElement([...parentPath, index], patch);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-accent/20 bg-accent/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-accent/70">
              Animação de entrada
            </div>
            <div className="mt-1 text-xs text-payday-textMuted/55">
              {enabled
                ? `${Math.round(animationDuration(draft) / 100) / 10}s no total · ${KIND_LABELS[draft.kind]}`
                : 'Elemento sem animação de entrada'}
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded border border-accent/30 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/10"
            onClick={() => (enabled ? apply(null) : apply(draft))}
          >
            {enabled ? 'Remover' : 'Animar'}
          </button>
        </div>
      </div>

      <Section id="presets" title="Presets">
        <div className="grid grid-cols-2 gap-2">
          {ANIMATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="rounded border border-payday-border bg-payday-surface px-2 py-2 text-left transition hover:border-accent/40 hover:bg-accent/5"
              onClick={() => applyPreset(preset.animation)}
              title={preset.description}
            >
              <span className="block text-xs font-medium text-payday-text">{preset.label}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-payday-textMuted/45">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section id="motion" title="Movimento" defaultOpen>
        <Field label="Tipo">
          <select
            className={inputClass}
            value={draft.kind}
            onChange={(event) => update({ kind: event.target.value as AnimationKind })}
          >
            {ANIMATION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </Field>

        {draft.kind === 'slide' ? (
          <>
            <Field label="Direção">
              <select
                className={inputClass}
                value={draft.direction}
                onChange={(event) =>
                  update({ direction: event.target.value as AnimationDirection })
                }
              >
                {ANIMATION_DIRECTIONS.map((direction) => (
                  <option key={direction} value={direction}>
                    {DIRECTION_LABELS[direction]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Distância · ${draft.distance}px`}>
              <input
                type="range"
                min={0}
                max={160}
                step={1}
                value={draft.distance}
                onChange={(event) => update({ distance: Number(event.target.value) })}
                className="w-full accent-accent"
              />
            </Field>
          </>
        ) : null}

        <Field label={`Duração · ${draft.duration.toFixed(2)}s`}>
          <input
            type="range"
            min={0.05}
            max={3}
            step={0.05}
            value={draft.duration}
            onChange={(event) => update({ duration: Number(event.target.value) })}
            className="w-full accent-accent"
          />
        </Field>

        <Field label={`Atraso · ${draft.delay.toFixed(2)}s`}>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={draft.delay}
            onChange={(event) => update({ delay: Number(event.target.value) })}
            className="w-full accent-accent"
          />
        </Field>

        <Field label="Curva">
          <select
            className={inputClass}
            value={draft.easing}
            onChange={(event) => update({ easing: event.target.value })}
          >
            {EASING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {EASING_OPTIONS.some((option) => option.value === draft.easing) ? null : (
              <option value={draft.easing}>Personalizada</option>
            )}
          </select>
        </Field>
      </Section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-accent/30 px-2.5 py-1.5 text-[11px] font-medium text-accent hover:bg-accent/10"
          onClick={replaySoon}
          disabled={!enabled}
        >
          Testar animação
        </button>
        <button
          type="button"
          className="rounded border border-white/10 px-2.5 py-1.5 text-[11px] text-payday-textMuted/65 hover:border-white/25 hover:text-payday-text disabled:opacity-35"
          onClick={copyToSiblings}
          disabled={!enabled}
        >
          Copiar para irmãos
        </button>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-accent/40';

function Section({
  title,
  id,
  defaultOpen,
  children,
}: {
  title: string;
  id: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <InspectorSection id={id} group="animation" title={title} defaultOpen={defaultOpen}>
      {children}
    </InspectorSection>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-payday-textDim/50">{label}</label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-white/10 p-3 text-[11px] leading-relaxed text-payday-textDim/60">
      {children}
    </div>
  );
}
