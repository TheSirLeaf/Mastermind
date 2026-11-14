// components/Stage/TextFormatBar.tsx
// Barra que aparece sobre o trecho selecionado do texto em edição: fonte, tamanho, estilo, cor
// e um painel avançado (gradiente, brilho animado, contorno, sombra, espaçamento e reflexo).
import type { TextFormatInfo } from '@packages/core/iframeBridge';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import {
  Bold,
  ChevronDown,
  Italic,
  Minus,
  Plus,
  RemoveFormatting,
  Sparkles,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { getActiveBridge } from '../../editor/bridgeRef';
import { ColorField } from '../common/ColorField';

const TEXT_FONTS: Array<[value: string, label: string]> = [
  ['', 'Padrão do texto'],
  ["'DM Sans', system-ui, sans-serif", 'DM Sans'],
  ["'Cormorant Garamond', Georgia, serif", 'Cormorant Garamond'],
  ["Georgia, 'Times New Roman', serif", 'Georgia'],
  ["'Times New Roman', Times, serif", 'Times New Roman'],
  ['Arial, Helvetica, sans-serif', 'Arial'],
  ["'Segoe UI', system-ui, sans-serif", 'Segoe UI'],
  ["'Trebuchet MS', sans-serif", 'Trebuchet'],
  ['Verdana, sans-serif', 'Verdana'],
  ["Impact, 'Arial Black', sans-serif", 'Impact'],
  ["ui-monospace, 'Cascadia Mono', Consolas, monospace", 'Monoespaçada'],
  ["'Brush Script MT', 'Segoe Script', cursive", 'Manuscrita'],
];

const GRADIENTS = [
  ['#F7D98B', '#C77C8A'],
  ['#FFF8F5', '#D6A84F'],
  ['#8FB8D8', '#8B5CF6'],
  ['#22C55E', '#06B6D4'],
  ['#F97316', '#EC4899'],
  ['#FFFFFF', '#737373'],
];

const SHADOWS: Array<[id: string, label: string]> = [
  ['none', 'Nenhuma'],
  ['soft', 'Suave'],
  ['strong', 'Forte'],
  ['glow', 'Neon'],
];

const REFLECTION = 'below 0px linear-gradient(transparent 40%, rgba(255,255,255,.3))';

/** Área da barra e do painel aberto nela: os seletores de cor abrem sem cobri-las. */
const barRect = (): DOMRect | undefined => {
  const bar = document.querySelector('[data-testid="text-format-bar"]');
  if (!bar) return undefined;
  const rects = [bar, ...bar.querySelectorAll('[role="menu"]')].map((el) =>
    el.getBoundingClientRect()
  );
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
};

function format(cmd: string, value?: unknown): void {
  getActiveBridge()?.command('format', { cmd, value });
}

const firstFamily = (font: string): string =>
  (font.split(',')[0] ?? '').replace(/["']/g, '').trim().toLowerCase();

function fontLabel(font: string): string {
  const fam = firstFamily(font);
  const hit = TEXT_FONTS.find(([value]) => value && firstFamily(value) === fam);
  return hit ? hit[1] : fam ? font.split(',')[0]!.replace(/["']/g, '') : 'Fonte';
}

/** Mantém o foco (e a seleção) no texto do palco ao clicar nos botões da barra. */
const keepFocus = (event: ReactMouseEvent) => {
  const tag = (event.target as HTMLElement).tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') event.preventDefault();
};

function IconToggle({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'flex h-7 w-7 items-center justify-center rounded-md transition',
        active
          ? 'bg-accent/20 text-accent'
          : 'text-payday-textMuted hover:bg-white/5 hover:text-payday-text'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

const Divider = () => <span className="mx-0.5 h-5 w-px bg-white/10" />;

/** Lista suspensa no tema do app (abre para cima ou para baixo, conforme o espaço). */
function Dropdown({
  label,
  title,
  width,
  children,
  className,
}: {
  label: ReactNode;
  title: string;
  width: number;
  children: (close: () => void) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (ref.current?.contains(target)) return;
      // Popovers do seletor de cor ficam fora (portal): clicar neles não fecha o painel.
      if (target.closest?.('[aria-label="Seletor de cor"]')) return;
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
    };
  }, [open]);
  const up = (ref.current?.getBoundingClientRect().top ?? 0) > window.innerHeight / 2;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex h-7 items-center gap-1 rounded-md px-2 text-[11px] transition',
          open ? 'bg-accent/15 text-accent' : 'text-payday-text hover:bg-white/5',
          className
        )}
      >
        {label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={title}
          className={clsx(
            'absolute left-0 z-10 max-h-[60vh] overflow-y-auto rounded-xl border border-accent/30 bg-payday-surface p-1.5 shadow-2xl',
            up ? 'bottom-full mb-2' : 'top-full mt-2'
          )}
          style={{ width }}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-widest text-payday-textDim">{label}</div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-white/10 p-0.5">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={clsx(
            'flex-1 rounded px-1.5 py-1 text-[11px] transition',
            value === id
              ? 'bg-accent/20 text-accent'
              : 'text-payday-textMuted hover:text-payday-text'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const rangeClass = 'h-1 w-full cursor-pointer accent-[#C77C8A]';

/** Painel avançado: efeitos aplicados ao trecho (o reflexo vale para a caixa de texto toda). */
function AdvancedPanel({ state }: { state: TextFormatInfo['state'] }) {
  const [fill, setFill] = useState<'solid' | 'gradient' | 'shine'>(
    state.shine ? 'shine' : state.gradient ? 'gradient' : 'solid'
  );
  const [from, setFrom] = useState('#F7D98B');
  const [to, setTo] = useState('#C77C8A');
  const [angle, setAngle] = useState(90);
  const [stroke, setStroke] = useState(0);
  const [strokeColor, setStrokeColor] = useState('#10060B');
  const [shadow, setShadow] = useState('none');
  const [glow, setGlow] = useState('#F7D98B');
  const [spacing, setSpacing] = useState(0);

  const gradient = (a: string, b: string, deg: number) => {
    setFrom(a);
    setTo(b);
    setAngle(deg);
    setFill('gradient');
    format('gradient', `linear-gradient(${deg}deg, ${a}, ${b})`);
  };
  const applyStroke = (w: number, c: string) => {
    setStroke(w);
    setStrokeColor(c);
    format('style', {
      '-webkit-text-stroke': w > 0 ? `${w}px ${c}` : null,
      'paint-order': w > 0 ? 'stroke fill' : null,
    });
  };
  const applyShadow = (id: string, c: string) => {
    setShadow(id);
    setGlow(c);
    const value =
      id === 'soft'
        ? '0 .04em .12em rgba(0,0,0,.45)'
        : id === 'strong'
          ? '.05em .07em 0 rgba(0,0,0,.85), 0 .1em .4em rgba(0,0,0,.5)'
          : id === 'glow'
            ? `0 0 .18em ${c}, 0 0 .5em ${c}, 0 0 1.1em ${c}`
            : null;
    format('style', { 'text-shadow': value });
  };

  return (
    <div className="space-y-3 p-1.5" data-testid="text-advanced">
      <Field label="Preenchimento">
        <Segmented
          value={fill}
          options={[
            ['solid', 'Cor'],
            ['gradient', 'Gradiente'],
            ['shine', 'Brilho animado'],
          ]}
          onChange={(next) => {
            setFill(next);
            if (next === 'gradient') gradient(from, to, angle);
            else if (next === 'shine') format('shine', true);
            else format('gradient', null);
          }}
        />
        {fill === 'gradient' ? (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-1.5">
              {GRADIENTS.map(([a, b]) => (
                <button
                  key={`${a}${b}`}
                  type="button"
                  title={`${a} → ${b}`}
                  aria-label={`Gradiente ${a} para ${b}`}
                  onClick={() => gradient(a!, b!, angle)}
                  className="h-6 rounded border border-white/15 transition hover:scale-110"
                  style={{ background: `linear-gradient(90deg, ${a}, ${b})` }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <ColorField
                avoid={barRect}
                compact
                value={from}
                ariaLabel="Cor inicial do gradiente"
                onChange={(c) => gradient(c, to, angle)}
              />
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={angle}
                aria-label="Ângulo do gradiente"
                className={rangeClass}
                onChange={(event) => gradient(from, to, Number(event.target.value))}
              />
              <ColorField
                avoid={barRect}
                compact
                value={to}
                ariaLabel="Cor final do gradiente"
                onChange={(c) => gradient(from, c, angle)}
              />
            </div>
          </div>
        ) : null}
        {fill === 'shine' ? (
          <p className="text-[11px] leading-snug text-payday-textDim">
            Um reflexo de luz passa pelo trecho, na cor atual dele.
          </p>
        ) : null}
      </Field>

      <Field label={`Contorno${stroke ? ` · ${stroke}px` : ''}`}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={8}
            step={0.5}
            value={stroke}
            aria-label="Espessura do contorno"
            className={rangeClass}
            onChange={(event) => applyStroke(Number(event.target.value), strokeColor)}
          />
          <ColorField
            avoid={barRect}
            compact
            value={strokeColor}
            ariaLabel="Cor do contorno"
            onChange={(c) => applyStroke(stroke || 2, c)}
          />
        </div>
      </Field>

      <Field label="Sombra">
        <Segmented value={shadow} options={SHADOWS} onChange={(id) => applyShadow(id, glow)} />
        {shadow === 'glow' ? (
          <div className="flex items-center gap-2 text-[11px] text-payday-textDim">
            <ColorField
              avoid={barRect}
              compact
              value={glow}
              ariaLabel="Cor do neon"
              onChange={(c) => applyShadow('glow', c)}
            />
            Cor do neon
          </div>
        ) : null}
      </Field>

      <Field label={`Espaço entre letras${spacing ? ` · ${spacing.toFixed(2)}em` : ''}`}>
        <input
          type="range"
          min={-0.08}
          max={0.5}
          step={0.01}
          value={spacing}
          aria-label="Espaço entre letras"
          className={rangeClass}
          onChange={(event) => {
            const v = Number(event.target.value);
            setSpacing(v);
            format('style', { 'letter-spacing': Math.abs(v) < 0.005 ? null : `${v}em` });
          }}
        />
      </Field>

      <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-[11px] text-payday-text">
        <span>
          Reflexo
          <span className="block text-[10px] text-payday-textDim">
            Espelha a caixa de texto toda
          </span>
        </span>
        <input
          type="checkbox"
          aria-label="Reflexo"
          checked={state.reflect}
          onChange={(event) => format('reflect', event.target.checked ? REFLECTION : null)}
          className="h-4 w-4 accent-[#C77C8A]"
        />
      </label>
    </div>
  );
}

function SizeStepper({ size }: { size: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const apply = () => {
    if (draft === null) return;
    const value = Number.parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(value) && value > 0) format('size', value);
    setDraft(null);
  };
  const step = (dir: 1 | -1) => (event: ReactMouseEvent) =>
    format('size-step', dir * (event.shiftKey ? 10 : 1));
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
        aria-label="Tamanho do trecho em px"
        value={draft ?? String(size)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={apply}
        onWheel={(event) => format('size-step', event.deltaY < 0 ? 1 : -1)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            apply();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            setDraft(null);
            format('size-step', (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1));
          } else if (event.key === 'Escape') setDraft(null);
        }}
        className="h-full w-9 bg-transparent text-center font-mono text-[11px] text-payday-text outline-none"
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

export function TextFormatBar() {
  const info = useUIStore((state) => state.textFormat);
  const barRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!info) {
      setPos(null);
      return;
    }
    const frame = document.querySelector<HTMLIFrameElement>(
      'iframe[title="Palco da apresentação"]'
    );
    if (!frame) return;
    const f = frame.getBoundingClientRect();
    const r = info.rect;
    const w = barRef.current?.offsetWidth ?? 520;
    const h = barRef.current?.offsetHeight ?? 40;
    // Trecho fora da área visível do palco: a barra some até ele voltar.
    if (r.top + r.height < 0 || r.top > f.height || r.left + r.width < 0 || r.left > f.width) {
      setPos(null);
      return;
    }
    const left = Math.max(
      f.left + 6,
      Math.min(f.right - w - 6, f.left + r.left + r.width / 2 - w / 2)
    );
    // folga para não cobrir a etiqueta "Texto · L×A" da seleção
    const above = f.top + r.top - h - 24;
    const top = above < f.top + 4 ? f.top + r.top + r.height + 10 : above;
    setPos({ left, top: Math.min(top, f.bottom - h - 4) });
  }, [info]);

  if (!info) return null;
  const s = info.state;

  return createPortal(
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Formatar trecho"
      data-testid="text-format-bar"
      onMouseDown={keepFocus}
      className="fixed z-[10500] flex items-center gap-0.5 rounded-xl border border-accent/30 bg-payday-surface/95 p-1 shadow-2xl backdrop-blur"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
    >
      <Dropdown
        title="Fonte do trecho"
        width={210}
        className="max-w-[128px]"
        label={<span className="truncate">{fontLabel(s.font)}</span>}
      >
        {(close) =>
          TEXT_FONTS.map(([value, label]) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                format('font', value);
                close();
              }}
              className={clsx(
                'block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition hover:bg-white/5',
                value && firstFamily(value) === firstFamily(s.font)
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
      <SizeStepper size={s.size} />
      <Divider />
      <IconToggle
        icon={Bold}
        label="Negrito (Ctrl+B)"
        active={s.bold}
        onClick={() => format('bold')}
      />
      <IconToggle
        icon={Italic}
        label="Itálico (Ctrl+I)"
        active={s.italic}
        onClick={() => format('italic')}
      />
      <IconToggle
        icon={Underline}
        label="Sublinhado (Ctrl+U)"
        active={s.underline}
        onClick={() => format('underline')}
      />
      <IconToggle
        icon={Strikethrough}
        label="Tachado"
        active={s.strike}
        onClick={() => format('strikeThrough')}
      />
      <IconToggle
        icon={Superscript}
        label="Sobrescrito"
        active={s.sup}
        onClick={() => format('superscript')}
      />
      <IconToggle
        icon={Subscript}
        label="Subscrito"
        active={s.sub}
        onClick={() => format('subscript')}
      />
      <Divider />
      <div className="px-0.5">
        <ColorField
          avoid={barRect}
          compact
          value={s.color}
          ariaLabel="Cor do trecho"
          onChange={(hex) => format('color', hex)}
        />
      </div>
      <Dropdown
        title="Efeitos avançados"
        width={290}
        label={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Avançado</span>
          </>
        }
      >
        {() => <AdvancedPanel state={s} />}
      </Dropdown>
      <IconToggle
        icon={RemoveFormatting}
        label="Limpar formatação do trecho"
        onClick={() => format('removeFormat')}
      />
    </div>,
    document.body
  );
}
