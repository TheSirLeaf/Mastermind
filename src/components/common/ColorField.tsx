// Seletor de cor: campo de hex (aceita colar), cores do slide, recentes, básicas,
// conta-gotas e a cor do sistema como último recurso.
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { Pipette } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getActiveBridge } from '../../editor/bridgeRef';

import { BASIC_COLORS, normalizeHex, readRecentColors, rememberColor } from './colorUtils';

interface ColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
  /** Só a amostra de cor (sem o campo de texto). */
  compact?: boolean;
  ariaLabel?: string;
  className?: string;
}

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>;
}

const POPOVER_W = 232;

function Swatch({
  color,
  active,
  onPick,
}: {
  color: string;
  active?: boolean;
  onPick: (hex: string) => void;
}) {
  return (
    <button
      type="button"
      title={color}
      aria-label={`Cor ${color}`}
      onClick={() => onPick(color)}
      className={clsx(
        'h-5 w-5 rounded border transition hover:scale-110',
        active ? 'border-accent ring-1 ring-accent' : 'border-white/20'
      )}
      style={{ background: color }}
    />
  );
}

export function ColorField({ value, onChange, compact, ariaLabel, className }: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const slideColors = useUIStore((state) => state.slidePalette);

  const current = normalizeHex(value) ?? '';

  const apply = (hex: string): void => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    onChange(normalized);
    setDraft(null);
  };
  const pick = (hex: string): void => {
    apply(hex);
    setRecent(rememberColor(hex));
  };

  // Ao abrir: recentes, cores atuais do slide e posição na tela.
  useEffect(() => {
    if (!open) return;
    setRecent(readRecentColors());
    getActiveBridge()?.requestPalette();
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const height = popRef.current?.offsetHeight ?? 300;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_W - 8));
    const below = rect.bottom + 6;
    const top =
      below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
    setPos({ left, top });
  }, [open, slideColors.length, recent.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const eyeDropper = (window as unknown as { EyeDropper?: new () => EyeDropperLike }).EyeDropper;
  const pickWithEyeDropper = async (): Promise<void> => {
    if (!eyeDropper) return;
    try {
      const result = await new eyeDropper().open();
      pick(result.sRGBHex);
    } catch {
      // Cancelado pelo usuário.
    }
  };

  const hexInput = (
    <input
      type="text"
      aria-label={ariaLabel ? `${ariaLabel} (hex)` : 'Cor em hexadecimal'}
      spellCheck={false}
      maxLength={24}
      placeholder="#RRGGBB"
      value={draft ?? current}
      onChange={(event) => {
        setDraft(event.target.value);
        // Aplica assim que o texto vira uma cor válida (dá para colar o hex direto).
        // (hex de 3 dígitos só vale ao sair do campo, para não mudar a cor no meio da digitação).
        const valid = normalizeHex(event.target.value);
        if (valid && /^(#?[0-9a-f]{6}|rgba?\()/i.test(event.target.value.trim())) onChange(valid);
      }}
      onPaste={(event) => {
        const valid = normalizeHex(event.clipboardData.getData('text'));
        if (!valid) return;
        event.preventDefault();
        pick(valid);
      }}
      onBlur={() => {
        if (draft !== null) {
          const valid = normalizeHex(draft);
          if (valid) {
            onChange(valid);
            setRecent(rememberColor(valid));
          }
          setDraft(null);
        }
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
      }}
      className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 font-mono text-[11px] uppercase text-cream outline-none transition focus:border-accent/40"
    />
  );

  return (
    <div ref={anchorRef} className={clsx('flex items-center gap-1.5', className)}>
      <button
        type="button"
        aria-label={ariaLabel ?? 'Escolher cor'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'h-7 w-7 shrink-0 rounded-md border transition hover:border-accent/60',
          open ? 'border-accent' : 'border-white/20',
          !current && 'bg-[repeating-conic-gradient(#555_0_25%,#333_0_50%)] bg-[length:8px_8px]'
        )}
        style={current ? { background: current } : undefined}
      />
      {compact ? null : hexInput}

      {open
        ? createPortal(
            <div
              ref={popRef}
              role="dialog"
              aria-label="Seletor de cor"
              className="fixed z-[11000] space-y-2.5 rounded-xl border border-accent/30 bg-payday-surface p-3 shadow-2xl"
              style={{
                width: POPOVER_W,
                left: pos?.left ?? -9999,
                top: pos?.top ?? -9999,
              }}
            >
              {compact ? <div className="flex">{hexInput}</div> : null}

              {slideColors.length > 0 ? (
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-payday-textDim">
                    Cores do slide
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {slideColors.map((c) => (
                      <Swatch key={c} color={c} active={c === current} onPick={pick} />
                    ))}
                  </div>
                </div>
              ) : null}

              {recent.length > 0 ? (
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-widest text-payday-textDim">
                    Recentes
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((c) => (
                      <Swatch key={c} color={c} active={c === current} onPick={pick} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-1 text-[10px] uppercase tracking-widest text-payday-textDim">
                  Básicas
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {BASIC_COLORS.map((c) => (
                    <Swatch key={c} color={c} active={c === current} onPick={pick} />
                  ))}
                </div>
              </div>

              <div className="flex gap-1.5 border-t border-payday-border pt-2">
                {eyeDropper ? (
                  <button
                    type="button"
                    onClick={() => void pickWithEyeDropper()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-payday-border px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
                  >
                    <Pipette className="h-3.5 w-3.5" /> Conta-gotas
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => nativeRef.current?.click()}
                  className="flex-1 rounded border border-payday-border px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
                >
                  Mais cores…
                </button>
                <input
                  ref={nativeRef}
                  type="color"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none absolute h-0 w-0 opacity-0"
                  value={current || '#000000'}
                  onChange={(event) => apply(event.target.value)}
                  onBlur={(event) => setRecent(rememberColor(event.target.value))}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
