// Controles de texto compartilhados pela barra do trecho e pelo inspetor:
// lista suspensa no tema, seletor de fonte, tamanho (− / +) e pequenos campos.
import { clsx } from 'clsx';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { firstFamily, fontLabel, TEXT_FONTS } from './fonts';

/** Lista suspensa no tema do app (abre para cima ou para baixo, conforme o espaço). */
export function Dropdown({
  label,
  title,
  width,
  children,
  className,
  block,
}: {
  label: ReactNode;
  title: string;
  width: number;
  children: (close: () => void) => ReactNode;
  className?: string | undefined;
  /** Ocupa a largura toda (inspetor). */
  block?: boolean | undefined;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    // Rolar/redimensionar reposiciona a lista (ela fica fixa na tela, fora dos painéis).
    const reflow = () => setTick((t) => t + 1);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      // Popovers do seletor de cor ficam fora (portal): clicar neles não fecha a lista.
      if (target.closest?.('[aria-label="Seletor de cor"]')) return;
      // Outros botões da mesma barra (negrito, tamanho…) não fecham a lista; abrir outra lista sim.
      const toolbar = ref.current?.closest('[role="toolbar"]');
      if (toolbar?.contains(target) && !target.closest?.('[data-dropdown]')) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[aria-label="Seletor de cor"]')) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [open]);
  const rect = ref.current?.getBoundingClientRect();
  const up = (rect?.top ?? 0) > window.innerHeight * 0.55;
  // Altura máxima: o espaço que sobra na tela para o lado em que a lista abre.
  const room = rect ? (up ? rect.top : window.innerHeight - rect.bottom) - 16 : 400;
  const left = rect ? Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) : 0;
  return (
    <div ref={ref} data-dropdown="" className={clsx('relative', block && 'w-full')}>
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition',
          block && 'w-full justify-between border border-payday-border bg-payday-surface',
          open ? 'bg-accent/15 text-accent' : 'text-payday-text hover:bg-white/5',
          className
        )}
      >
        {label}
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={title}
              data-text-menu=""
              className="fixed z-[10600] overflow-y-auto overscroll-contain rounded-xl border border-accent/30 bg-payday-surface p-1.5 shadow-2xl"
              style={{
                width,
                left,
                maxHeight: Math.max(160, room),
                ...(up ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
              }}
            >
              {children(() => setOpen(false))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export function FontPicker({
  font,
  onPick,
  block,
  emptyLabel,
}: {
  font: string;
  onPick: (value: string) => void;
  block?: boolean | undefined;
  emptyLabel?: string;
}) {
  return (
    <Dropdown
      title="Fonte"
      width={220}
      block={block}
      className={block ? undefined : 'max-w-[128px]'}
      label={<span className="truncate">{fontLabel(font, emptyLabel)}</span>}
    >
      {(close) =>
        TEXT_FONTS.map(([value, label]) => (
          <button
            key={label}
            type="button"
            role="menuitem"
            onClick={() => {
              onPick(value);
              close();
            }}
            className={clsx(
              'block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition hover:bg-white/5',
              (value ? firstFamily(value) === firstFamily(font) : !font)
                ? 'text-accent'
                : 'text-payday-text'
            )}
            style={value ? { fontFamily: value } : undefined}
          >
            {label}
          </button>
        ))
      }
    </Dropdown>
  );
}

/** Tamanho em px: − / + de 1 em 1 (Shift: 10), setas, roda do mouse ou digitando. */
export function SizeStepper({
  size,
  onSet,
  onStep,
  label = 'Tamanho do trecho em px',
}: {
  size: number;
  onSet: (px: number) => void;
  onStep: (delta: number) => void;
  label?: string | undefined;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const apply = () => {
    if (draft === null) return;
    const value = Number.parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(value) && value > 0) onSet(value);
    setDraft(null);
  };
  const step = (dir: 1 | -1) => (event: ReactMouseEvent) => onStep(dir * (event.shiftKey ? 10 : 1));
  return (
    <div
      className="flex h-7 items-center rounded-md border border-white/10 bg-black/20"
      title="Tamanho (px). Shift + clique: de 10 em 10. Rolar o mouse também muda."
    >
      <button
        type="button"
        aria-label="Diminuir o tamanho"
        onClick={step(-1)}
        className="flex h-full w-6 items-center justify-center rounded-l-md text-payday-textMuted transition hover:bg-white/5 hover:text-accent"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft ?? String(size)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={apply}
        onWheel={(event) => onStep(event.deltaY < 0 ? 1 : -1)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            apply();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            setDraft(null);
            onStep((event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1));
          } else if (event.key === 'Escape') setDraft(null);
        }}
        className="h-full w-9 min-w-0 flex-1 bg-transparent text-center font-mono text-[11px] text-payday-text outline-none"
      />
      <button
        type="button"
        aria-label="Aumentar o tamanho"
        onClick={step(1)}
        className="flex h-full w-6 items-center justify-center rounded-r-md text-payday-textMuted transition hover:bg-white/5 hover:text-accent"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-md border border-white/10 p-0.5"
    >
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={clsx(
            'flex-1 rounded px-1.5 py-1 text-[11px] transition',
            value === id
              ? 'bg-accent/20 text-accent'
              : 'text-payday-textMuted hover:text-payday-text'
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Controle deslizante com rótulo e valor ao lado. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <label className="grid grid-cols-[64px_1fr_40px] items-center gap-2 text-[11px] text-payday-textDim">
      <span className="truncate">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer accent-[#C77C8A]"
      />
      <span className="text-right font-mono text-[10px] text-payday-text">
        {value.toFixed(decimals)}
        {unit}
      </span>
    </label>
  );
}
