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
      <div className="rounded border border-[#F7D98B]/20 bg-[#F7D98B]/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#F7D98B]/70">
              Animação de entrada
            </div>
            <div className="mt-1 text-xs text-[#F3E6E2]/55">
              {enabled
                ? `${Math.round(animationDuration(draft) / 100) / 10}s no total · ${KIND_LABELS[draft.kind]}`
                : 'Elemento sem animação de entrada'}
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded border border-[#F7D98B]/30 px-2 py-1 text-[10px] font-medium text-[#F7D98B] hover:bg-[#F7D98B]/10"
            onClick={() => (enabled ? apply(null) : apply(draft))}
          >
            {enabled ? 'Remover' : 'Animar'}
          </button>
        </div>
      </div>

      <Section title="Presets">
        <div className="grid grid-cols-2 gap-2">
          {ANIMATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="rounded border border-white/10 bg-black/15 px-2 py-2 text-left transition hover:border-[#F7D98B]/40 hover:bg-[#F7D98B]/5"
              onClick={() => applyPreset(preset.animation)}
              title={preset.description}
            >
              <span className="block text-xs font-medium text-[#F3E6E2]">{preset.label}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-[#F3E6E2]/45">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Movimento">
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
                className="w-full accent-[#F7D98B]"
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
            className="w-full accent-[#F7D98B]"
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
            className="w-full accent-[#F7D98B]"
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
          className="rounded border border-[#F7D98B]/30 px-2.5 py-1.5 text-[11px] font-medium text-[#F7D98B] hover:bg-[#F7D98B]/10"
          onClick={replaySoon}
          disabled={!enabled}
        >
          Testar animação
        </button>
        <button
          type="button"
          className="rounded border border-white/10 px-2.5 py-1.5 text-[11px] text-[#F3E6E2]/65 hover:border-white/25 hover:text-[#F3E6E2] disabled:opacity-35"
          onClick={copyToSiblings}
          disabled={!enabled}
        >
          Copiar para irmãos
        </button>
      </div>

      <p className="text-[10px] leading-relaxed text-[#F3E6E2]/35">
        A animação fica gravada no HTML do slide e vale no editor, no export e no PDF. Com “reduzir
        movimento” ativo no sistema, o conteúdo aparece direto.
      </p>
    </div>
  );
}

const inputClass =
  'w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-[#F3E6E2] outline-none focus:border-[#F7D98B]/40';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group open" open>
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-[#F3E6E2]/60">
        <svg
          className="h-4 w-4 text-[#F7D98B]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </svg>
        {title}
      </summary>
      <div className="space-y-2 px-3 pb-3 pt-2">{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-[#F3E6E2]/50">{label}</label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-white/10 p-3 text-[11px] leading-relaxed text-[#F3E6E2]/60">
      {children}
    </div>
  );
}
