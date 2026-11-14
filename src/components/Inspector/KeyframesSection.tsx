// Interpolação: keyframes do elemento selecionado (posição, escala, giro e opacidade no tempo).
import {
  hasTextKeys,
  KEYFRAME_DEFAULT,
  KEYFRAME_EASINGS,
  keyframesPatch,
  normalizeKeyframe,
  readKeyframes,
  type Keyframe,
} from '@packages/core/keyframes';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { ColorField } from '../common/ColorField';

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-1.5 py-1 text-xs text-payday-text outline-none focus:border-accent/40';

interface NumberCellProps {
  label: string;
  value: number;
  step?: number;
  onCommit: (value: number) => void;
}

/** Número que só é gravado ao sair do campo (ou com Enter), para dar tempo de digitar. */
function NumberCell({ label, value, step = 1, onCommit }: NumberCellProps) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-payday-textDim/60">{label}</span>
      <input
        key={value}
        type="number"
        step={step}
        defaultValue={value}
        aria-label={label}
        className={inputClass}
        onBlur={(event) => {
          const n = Number.parseFloat(event.target.value);
          if (Number.isFinite(n) && n !== value) onCommit(n);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

/** Número opcional: vazio = valor natural do texto. */
function OptNumberCell({
  label,
  value,
  step = 1,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  step?: number;
  onCommit: (value: number | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-payday-textDim/60">{label}</span>
      <input
        key={String(value)}
        type="number"
        step={step}
        defaultValue={value ?? ''}
        placeholder="natural"
        aria-label={label}
        className={`${inputClass} placeholder:text-payday-textDim/40`}
        onBlur={(event) => {
          const raw = event.target.value.trim();
          const n = Number.parseFloat(raw);
          const next = raw === '' || !Number.isFinite(n) ? undefined : n;
          if (next !== value) onCommit(next);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

const WEIGHTS: Array<[string, string]> = [
  ['', 'Natural'],
  ['300', 'Fino'],
  ['400', 'Normal'],
  ['500', 'Médio'],
  ['600', 'Semi'],
  ['700', 'Negrito'],
  ['900', 'Pesado'],
];

/** Formatação do texto num keyframe: cada campo vazio segue o valor natural do texto. */
function KeyframeText({
  k,
  label,
  onChange,
}: {
  k: Keyframe;
  label: string;
  onChange: (patch: Partial<Keyframe>) => void;
}) {
  const [open, setOpen] = useState(hasTextKeys(k));
  return (
    <div className="rounded border border-white/5" data-testid="keyframe-text">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Texto do ${label}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-1.5 py-1 text-[10px] uppercase tracking-widest text-payday-textDim transition hover:text-payday-text"
      >
        <ChevronRight className={`h-3 w-3 transition ${open ? 'rotate-90' : ''}`} />
        <span className="flex-1 text-left">Texto</span>
        {hasTextKeys(k) ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
      </button>
      {open ? (
        <div className="space-y-1.5 px-1.5 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-14 text-[9px] uppercase tracking-wider text-payday-textDim/60">
              Cor
            </span>
            <ColorField
              compact
              value={k.c ?? ''}
              ariaLabel={`Cor do texto no ${label}`}
              onChange={(c) => onChange({ c })}
            />
            {k.c ? (
              <button
                type="button"
                aria-label="Voltar a cor ao natural"
                title="Voltar ao natural"
                onClick={() => onChange({ c: undefined })}
                className="grid h-5 w-5 place-items-center text-payday-textDim transition hover:text-accent"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <span className="text-[10px] text-payday-textDim/50">natural</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <OptNumberCell label="Tamanho (px)" value={k.fs} onCommit={(fs) => onChange({ fs })} />
            <label className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-wider text-payday-textDim/60">
                Peso
              </span>
              <select
                aria-label="Peso"
                className={inputClass}
                value={k.w === undefined ? '' : String(k.w)}
                onChange={(event) =>
                  onChange({ w: event.target.value ? Number(event.target.value) : undefined })
                }
              >
                {WEIGHTS.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <OptNumberCell
              label="Letras (em)"
              value={k.ls}
              step={0.01}
              onCommit={(ls) => onChange({ ls })}
            />
            <OptNumberCell
              label="Brilho (px)"
              value={k.g}
              onCommit={(g) => onChange({ g, gc: k.gc })}
            />
            <OptNumberCell
              label="Desfoque (px)"
              value={k.bl}
              step={0.5}
              onCommit={(bl) => onChange({ bl })}
            />
            {k.g !== undefined ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-wider text-payday-textDim/60">
                  Cor do brilho
                </span>
                <ColorField
                  compact
                  value={k.gc ?? '#F7D98B'}
                  ariaLabel={`Cor do brilho no ${label}`}
                  onChange={(gc) => onChange({ gc })}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function KeyframesSection({ path, element }: { path: number[]; element: Element | null }) {
  const list = element ? readKeyframes(element) : [];
  // Texto (com conteúdo e sem ser pacote): os keyframes podem mudar também a formatação.
  const isText = Boolean(
    element && (element.textContent ?? '').trim() !== '' && !element.closest('[data-pkg]')
  );
  const active = useUIStore((state) => state.activeKeyframe);
  const activeIndex = active && active.path.join('.') === path.join('.') ? active.index : -1;
  const setActive = (index: number | null): void =>
    useUIStore.getState().setActiveKeyframe(index === null ? null : { path, index });

  const save = (next: Keyframe[]): void => {
    useDeckStore.getState().patchElement(path, keyframesPatch(next));
  };
  const change = (index: number, patch: Partial<Keyframe>): void => {
    const edited = normalizeKeyframe({ ...list[index], ...patch });
    save(list.map((k, i) => (i === index ? edited : k)));
    // Mudar o tempo pode reordenar a lista: o keyframe em edição continua sendo o mesmo.
    if (activeIndex === index) {
      const sorted = list.map((k, i) => (i === index ? edited : k)).sort((a, b) => a.t - b.t);
      setActive(Math.max(0, sorted.indexOf(edited)));
    }
  };
  const add = (): void => {
    const last = list[list.length - 1];
    const created = normalizeKeyframe({ ...(last ?? KEYFRAME_DEFAULT), t: (last?.t ?? 0) + 1 });
    save([...list, created]);
    setActive(list.length);
  };
  const test = (): void => {
    window.setTimeout(() => useUIStore.getState().replayAnimations(), 60);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-payday-textDim">
        O elemento parte do lugar em que está e passa por cada keyframe no tempo indicado. Valores
        relativos ao estado natural dele.
        {isText ? ' Em textos, cada keyframe também pode mudar cor, tamanho, peso e brilho.' : ''}
      </p>

      {list.map((k, index) => (
        <div
          key={index}
          className={`space-y-1.5 rounded-md border p-2 ${
            index === activeIndex ? 'border-accent/70 bg-accent/10' : 'border-white/10 bg-black/20'
          }`}
          data-testid="keyframe"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActive(index === activeIndex ? null : index)}
              title="Mostrar o elemento neste keyframe no palco"
              className="text-[10px] uppercase tracking-widest text-accent/80 hover:text-accent"
            >
              Keyframe {index + 1} {index === activeIndex ? '· no palco' : '· ver no palco'}
            </button>
            <button
              type="button"
              aria-label={`Remover keyframe ${index + 1}`}
              onClick={() => {
                if (activeIndex >= 0) setActive(null);
                save(list.filter((_k, i) => i !== index));
              }}
              className="grid h-5 w-5 place-items-center text-payday-textDim transition hover:text-accent"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <NumberCell
              label="Tempo (s)"
              value={k.t}
              step={0.1}
              onCommit={(t) => change(index, { t })}
            />
            <NumberCell label="X (px)" value={k.x} onCommit={(x) => change(index, { x })} />
            <NumberCell label="Y (px)" value={k.y} onCommit={(y) => change(index, { y })} />
            <NumberCell
              label="Escala (%)"
              value={Math.round(k.s * 100)}
              onCommit={(s) => change(index, { s: s / 100 })}
            />
            <NumberCell label="Giro (°)" value={k.r} onCommit={(r) => change(index, { r })} />
            <NumberCell
              label="Opac. (%)"
              value={Math.round(k.o * 100)}
              onCommit={(o) => change(index, { o: o / 100 })}
            />
          </div>
          {isText ? (
            <KeyframeText
              k={k}
              label={`keyframe ${index + 1}`}
              onChange={(patch) => change(index, patch)}
            />
          ) : null}
          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-wider text-payday-textDim/60">
              Curva até o próximo
            </span>
            <select
              className={inputClass}
              value={k.ease}
              onChange={(event) => change(index, { ease: event.target.value })}
            >
              {KEYFRAME_EASINGS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded border border-accent/30 px-2.5 py-1.5 text-[11px] font-medium text-accent transition hover:bg-accent/10"
        >
          <Plus className="h-3 w-3" /> Keyframe
        </button>
        <button
          type="button"
          onClick={test}
          disabled={list.length === 0}
          className="rounded border border-white/10 px-2.5 py-1.5 text-[11px] text-payday-textMuted/70 transition hover:border-white/25 hover:text-payday-text disabled:opacity-35"
        >
          Testar interpolação
        </button>
        {list.length > 0 ? (
          <button
            type="button"
            onClick={() => save([])}
            className="rounded border border-white/10 px-2.5 py-1.5 text-[11px] text-payday-textMuted/70 transition hover:border-red-400/40 hover:text-red-300"
          >
            Remover todos
          </button>
        ) : null}
      </div>
    </div>
  );
}
