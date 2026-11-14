// Seletor de cor: campo de hex (aceita colar), cores do slide, recentes, cores da marca,
// grade de tons, seletor livre (saturação/brilho + matiz) e conta-gotas.
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { Pipette } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { getActiveBridge } from '../../editor/bridgeRef';

import {
  hexToHsv,
  hsvToHex,
  normalizeHex,
  readRecentColors,
  rememberColor,
  TONAL_COLORS,
} from './colorUtils';

interface ColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
  /** Só a amostra de cor (sem o campo de texto). */
  compact?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Área que o seletor não deve cobrir (ex.: a barra inteira onde o campo está). */
  avoid?: (() => DOMRect | null | undefined) | undefined;
}

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>;
}

const POPOVER_W = 276;

const BRAND_COLORS = [
  '#FFF8F5',
  '#F7D98B',
  '#D6A84F',
  '#C77C8A',
  '#8E3B52',
  '#411725',
  '#2A0E1A',
  '#10060B',
];

/** Seletor livre: quadrado de saturação/brilho e barra de matiz (arrastáveis). */
function HsvPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value || '#C77C8A'));
  const last = useRef(value);
  useEffect(() => {
    // Só relê quando a cor muda por fora (amostra, hex), para o matiz não "pular" no cinza.
    if (value && value !== last.current) setHsv(hexToHsv(value));
    last.current = value;
  }, [value]);

  const commit = (next: { h: number; s: number; v: number }) => {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    last.current = hex;
    onChange(hex);
  };
  const drag =
    (apply: (x: number, y: number) => void) => (event: ReactPointerEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      el.setPointerCapture(event.pointerId);
      const at = (e: { clientX: number; clientY: number }) => {
        const r = el.getBoundingClientRect();
        apply(
          Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
          Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))
        );
      };
      at(event);
      const move = (e: PointerEvent) => at(e);
      const up = () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    };

  return (
    <div className="space-y-2">
      <div
        role="slider"
        aria-label="Saturação e brilho"
        aria-valuenow={Math.round(hsv.s * 100)}
        className="relative h-24 cursor-crosshair touch-none rounded-md"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(hsv.h, 1, 1)})`,
        }}
        onPointerDown={drag((x, y) => commit({ ...hsv, s: x, v: 1 - y }))}
      >
        <span
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>
      <div
        role="slider"
        aria-label="Matiz"
        aria-valuenow={Math.round(hsv.h)}
        className="relative h-3 cursor-pointer touch-none rounded-full"
        style={{
          background:
            'linear-gradient(to right,#f00,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00)',
        }}
        onPointerDown={drag((x) => commit({ ...hsv, h: Math.min(359.9, x * 360) }))}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.5)]"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Swatch({
  color,
  active,
  onPick,
  fluid,
}: {
  color: string;
  active?: boolean;
  onPick: (hex: string) => void;
  fluid?: boolean;
}) {
  return (
    <button
      type="button"
      title={color}
      aria-label={`Cor ${color}`}
      onClick={() => onPick(color)}
      className={clsx(
        fluid ? 'aspect-square w-full rounded-[3px]' : 'h-5 w-5 rounded',
        'border transition hover:z-10 hover:scale-125',
        active ? 'border-accent ring-1 ring-accent' : 'border-white/20'
      )}
      style={{ background: color }}
    />
  );
}

export function ColorField({
  value,
  onChange,
  compact,
  ariaLabel,
  className,
  avoid,
}: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const slideColors = useUIStore((state) => state.slidePalette);

  const current = normalizeHex(value) ?? '';
  const currentRef = useRef(current);
  currentRef.current = current;

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
    const rect = avoid?.() ?? anchorRef.current.getBoundingClientRect();
    const height = popRef.current?.offsetHeight ?? 300;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_W - 8));
    const below = rect.bottom + 6;
    const above = rect.top - height - 6;
    if (below + height <= window.innerHeight - 8) setPos({ left, top: below });
    else if (above >= 8) setPos({ left, top: above });
    else {
      // Não cabe nem acima nem abaixo: abre ao lado, sem cobrir quem o abriu.
      const right = rect.right + 8;
      const side =
        right + POPOVER_W <= window.innerWidth - 8 ? right : Math.max(8, rect.left - POPOVER_W - 8);
      const top = Math.max(8, Math.min(rect.top - height / 3, window.innerHeight - height - 8));
      setPos({ left: side, top });
    }
  }, [open, slideColors.length, recent.length, avoid]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      if (currentRef.current) setRecent(rememberColor(currentRef.current));
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Esc só fecha o seletor (não desmarca o elemento nem encerra a edição do texto).
      event.stopImmediatePropagation();
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
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
                  Da marca
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {BRAND_COLORS.map((c) => (
                    <Swatch key={c} color={c} active={c === current} onPick={pick} fluid />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 text-[10px] uppercase tracking-widest text-payday-textDim">
                  Tons
                </div>
                <div className="grid grid-cols-12 gap-1">
                  {TONAL_COLORS.map((c, i) => (
                    <Swatch
                      key={`${c}-${i}`}
                      color={c}
                      active={c === current}
                      onPick={pick}
                      fluid
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-payday-textDim">
                  Personalizada
                  {eyeDropper ? (
                    <button
                      type="button"
                      onClick={() => void pickWithEyeDropper()}
                      title="Conta-gotas: pega uma cor da tela"
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 normal-case tracking-normal text-payday-textMuted transition hover:text-accent"
                    >
                      <Pipette className="h-3 w-3" /> Conta-gotas
                    </button>
                  ) : null}
                </div>
                <HsvPicker
                  value={current}
                  onChange={(hex) => {
                    onChange(hex);
                    setDraft(null);
                  }}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
