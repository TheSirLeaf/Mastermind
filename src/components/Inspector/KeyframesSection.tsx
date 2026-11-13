// Interpolação: keyframes do elemento selecionado (posição, escala, giro e opacidade no tempo).
import {
  KEYFRAME_DEFAULT,
  KEYFRAME_EASINGS,
  keyframesPatch,
  normalizeKeyframe,
  readKeyframes,
  type Keyframe,
} from '@packages/core/keyframes';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { Plus, Trash2 } from 'lucide-react';

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

export function KeyframesSection({ path, element }: { path: number[]; element: Element | null }) {
  const list = element ? readKeyframes(element) : [];
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
