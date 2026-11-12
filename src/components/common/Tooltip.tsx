// components/common/Tooltip.tsx
// Tooltip rico no estilo do Eagle: título, descrição curta e atalho em "keycaps",
// com atraso de abertura, seta e posicionamento que não sai da janela.
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** Nome da ação. */
  title: string;
  /** Explicação de uma linha (opcional). */
  description?: string | undefined;
  /** Atalho, ex.: `Ctrl+Z` — cada parte vira uma tecla. */
  shortcut?: string | undefined;
  side?: TooltipSide;
  /** Atraso em ms antes de aparecer (padrão 450). */
  delay?: number;
  disabled?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}

const GAP = 10;
const MARGIN = 8;

// Depois que um tooltip abriu, os vizinhos abrem quase na hora (como no Eagle).
let lastClosedAt = 0;

export function Tooltip({
  title,
  description,
  shortcut,
  side = 'bottom',
  delay = 450,
  disabled,
  className,
  children,
}: TooltipProps) {
  const enabled = useUIStore((state) => state.tooltipsEnabled);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; arrow: number; side: TooltipSide }>();

  const hide = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setOpen((was) => {
      if (was) lastClosedAt = Date.now();
      return false;
    });
  }, []);

  const show = useCallback(() => {
    if (disabled || !enabled) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    const wait = Date.now() - lastClosedAt < 350 ? 60 : delay;
    timer.current = window.setTimeout(() => setOpen(true), wait);
  }, [delay, disabled, enabled]);

  useEffect(() => () => hide(), [hide]);
  useEffect(() => {
    if (!open) return;
    const close = () => hide();
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('pointerdown', close, true);
    return () => {
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('pointerdown', close, true);
    };
  }, [open, hide]);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !bubbleRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const b = bubbleRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let use = side;
    // Inverte se não couber no lado pedido.
    if (side === 'bottom' && a.bottom + GAP + b.height > vh - MARGIN) use = 'top';
    else if (side === 'top' && a.top - GAP - b.height < MARGIN) use = 'bottom';
    else if (side === 'right' && a.right + GAP + b.width > vw - MARGIN) use = 'left';
    else if (side === 'left' && a.left - GAP - b.width < MARGIN) use = 'right';

    let left: number;
    let top: number;
    if (use === 'top' || use === 'bottom') {
      left = a.left + a.width / 2 - b.width / 2;
      top = use === 'bottom' ? a.bottom + GAP : a.top - GAP - b.height;
    } else {
      top = a.top + a.height / 2 - b.height / 2;
      left = use === 'right' ? a.right + GAP : a.left - GAP - b.width;
    }
    left = Math.min(Math.max(MARGIN, left), vw - b.width - MARGIN);
    top = Math.min(Math.max(MARGIN, top), vh - b.height - MARGIN);
    const arrow =
      use === 'top' || use === 'bottom'
        ? Math.min(Math.max(12, a.left + a.width / 2 - left), b.width - 12)
        : Math.min(Math.max(12, a.top + a.height / 2 - top), b.height - 12);
    setPos({ left, top, arrow, side: use });
  }, [open, side, title, description, shortcut]);

  const keys = shortcut ? shortcut.split('+').map((part) => part.trim()) : [];

  return (
    <span
      ref={anchorRef}
      className={clsx('inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open
        ? createPortal(
            <div
              ref={bubbleRef}
              role="tooltip"
              className="mm-tooltip pointer-events-none fixed z-[200] max-w-[260px] rounded-lg border border-white/10 bg-[#1b1b1d]/95 px-3 py-2 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)] backdrop-blur"
              style={{
                left: pos?.left ?? -9999,
                top: pos?.top ?? -9999,
                opacity: pos ? 1 : 0,
                animation: pos ? 'mmTipIn 120ms ease-out' : undefined,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-payday-text">{title}</span>
                {keys.length > 0 ? (
                  <span className="ml-auto flex shrink-0 gap-1">
                    {keys.map((key) => (
                      <kbd
                        key={key}
                        className="min-w-[18px] rounded border border-white/15 bg-white/10 px-1.5 py-px text-center font-mono text-[10px] text-accent"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                ) : null}
              </div>
              {description ? (
                <p className="mt-1 text-[11px] leading-snug text-payday-textMuted">{description}</p>
              ) : null}
              {pos ? (
                <span
                  aria-hidden="true"
                  className="absolute h-2 w-2 rotate-45 border-white/10 bg-[#1b1b1d]"
                  style={
                    pos.side === 'bottom'
                      ? { top: -4, left: pos.arrow - 4, borderLeftWidth: 1, borderTopWidth: 1 }
                      : pos.side === 'top'
                        ? {
                            bottom: -4,
                            left: pos.arrow - 4,
                            borderRightWidth: 1,
                            borderBottomWidth: 1,
                          }
                        : pos.side === 'right'
                          ? {
                              left: -4,
                              top: pos.arrow - 4,
                              borderLeftWidth: 1,
                              borderBottomWidth: 1,
                            }
                          : {
                              right: -4,
                              top: pos.arrow - 4,
                              borderRightWidth: 1,
                              borderTopWidth: 1,
                            }
                  }
                />
              ) : null}
            </div>,
            document.body
          )
        : null}
    </span>
  );
}
