// components/Stage/TextFormatBar.tsx
// Barra sobre o trecho selecionado do texto em edição: fonte, tamanho, estilo, cor e o painel
// de efeitos (o mesmo do inspetor). Segue o trecho suavemente ao mover a tela e dar zoom.
import type { TextFormatInfo } from '@packages/core/iframeBridge';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import {
  Bold,
  Italic,
  RemoveFormatting,
  Sparkles,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  type LucideIcon,
} from 'lucide-react';
import { useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';

import { getActiveBridge } from '../../editor/bridgeRef';
import {
  DEFAULT_FILL,
  FX_PROPS,
  isEmptyFx,
  parseReflect,
  parseTextFx,
  reflectToCss,
  textFxToCss,
  textFxToNestedCss,
  type TextFx,
  type TextReflect,
} from '../../editor/textFx';
import { ColorField } from '../common/ColorField';
import { Dropdown, FontPicker, SizeStepper } from '../Text/TextControls';
import { TextEffectsPanel } from '../Text/TextEffectsPanel';

/** Área da barra e do painel aberto nela: os seletores de cor abrem sem cobri-las. */
const barRect = (): DOMRect | undefined => {
  const bar = document.querySelector('[data-testid="text-format-bar"]');
  if (!bar) return undefined;
  const rects = [bar, ...document.querySelectorAll('[data-text-menu]')].map((el) =>
    el.getBoundingClientRect()
  );
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
};

function format(cmd: string, value?: unknown, extra?: Record<string, unknown>): void {
  getActiveBridge()?.command('format', { cmd, value, ...extra });
}

/** Aplica os efeitos ao trecho (CSS pronto + configuração guardada no `data-fx`). */
function applyTrechoFx(fx: TextFx): void {
  format('fx', {
    css: textFxToCss(fx),
    nested: textFxToNestedCss(fx),
    data: isEmptyFx(fx) ? null : JSON.stringify(fx),
    shine: fx.fill?.kind === 'shine',
  });
}

function applyReflect(reflect: TextReflect | null): void {
  format('reflect', { css: reflectToCss(reflect), data: reflect ? JSON.stringify(reflect) : null });
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

interface Placement {
  x: number;
  y: number;
  above: boolean;
  visible: boolean;
}

/** Onde a barra fica: acima do trecho (ou abaixo, sem ficar trocando de lado à toa). */
function place(
  info: TextFormatInfo,
  frame: DOMRect,
  size: { w: number; h: number },
  prev: Placement | null
): Placement {
  const r = info.rect;
  const visible = !(
    r.top + r.height < 0 ||
    r.top > frame.height ||
    r.left + r.width < 0 ||
    r.left > frame.width
  );
  const x = Math.max(
    frame.left + 6,
    Math.min(frame.right - size.w - 6, frame.left + r.left + r.width / 2 - size.w / 2)
  );
  // folga para não cobrir a etiqueta "Texto · L×A" da seleção
  const aboveY = frame.top + r.top - size.h - 24;
  const belowY = frame.top + r.top + r.height + 12;
  const fitsAbove = aboveY >= frame.top + 4;
  const fitsBelow = belowY + size.h <= frame.bottom - 4;
  // Histerese: estando embaixo, só volta para cima quando embaixo deixa de caber.
  const above = prev && !prev.above && fitsBelow ? false : fitsAbove || !fitsBelow;
  const y = Math.min(above ? aboveY : belowY, frame.bottom - size.h - 4);
  return { x, y, above, visible };
}

export function TextFormatBar() {
  const info = useUIStore((state) => state.textFormat);
  const barRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const lastRef = useRef<Placement | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    if (!info) {
      lastRef.current = null;
      setAnimate(false);
      setPlacement(null);
      return;
    }
    const frame = document
      .querySelector<HTMLIFrameElement>('iframe[title="Palco da apresentação"]')
      ?.getBoundingClientRect();
    if (!frame) return;
    const size = {
      w: barRef.current?.offsetWidth ?? 540,
      h: barRef.current?.offsetHeight ?? 38,
    };
    const prev = lastRef.current;
    const next = place(info, frame, size, prev);
    // Ignora variações de menos de meio pixel (evita tremer a cada seleção).
    if (
      prev &&
      prev.visible === next.visible &&
      prev.above === next.above &&
      Math.abs(prev.x - next.x) < 0.5 &&
      Math.abs(prev.y - next.y) < 0.5
    )
      return;
    lastRef.current = next;
    // Primeira aparição: sem animação (só depois ela desliza de um ponto ao outro).
    setAnimate(Boolean(prev?.visible));
    setPlacement(next);
  }, [info]);

  if (!info) return null;
  const s = info.state;
  const fx = parseTextFx(s.fx);
  const reflect = s.reflect ? parseReflect(s.reflect) : null;
  const pos = placement ?? { x: -9999, y: -9999, visible: false };

  return createPortal(
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Formatar trecho"
      data-testid="text-format-bar"
      onMouseDown={keepFocus}
      className="fixed left-0 top-0 z-[10500] flex items-center gap-0.5 rounded-xl border border-accent/30 bg-payday-surface/95 p-1 shadow-2xl backdrop-blur will-change-transform"
      style={{
        transform: `translate3d(${Math.round(pos.x)}px, ${Math.round(pos.y)}px, 0)`,
        opacity: pos.visible ? 1 : 0,
        pointerEvents: pos.visible ? undefined : 'none',
        transition: animate
          ? 'transform 140ms cubic-bezier(.2,.8,.2,1), opacity 120ms ease'
          : 'opacity 120ms ease',
      }}
    >
      <FontPicker font={s.font} onPick={(value) => format('font', value)} />
      <SizeStepper
        size={s.size}
        onSet={(px) => format('size', px)}
        onStep={(delta) => format('size-step', delta)}
      />
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
          value={fx.fill?.kind === 'solid' ? fx.fill.color : s.color}
          ariaLabel="Cor do trecho"
          onChange={(hex) =>
            applyTrechoFx({
              ...fx,
              fill: { ...(fx.fill ?? structuredClone(DEFAULT_FILL)), kind: 'solid', color: hex },
            })
          }
        />
      </div>
      <Dropdown
        title="Efeitos avançados"
        width={318}
        label={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>Avançado</span>
          </>
        }
      >
        {() => (
          <TextEffectsPanel
            fx={fx}
            onFx={applyTrechoFx}
            reflect={reflect}
            onReflect={applyReflect}
            inline
            avoid={barRect}
          />
        )}
      </Dropdown>
      <IconToggle
        icon={RemoveFormatting}
        label="Limpar formatação do trecho"
        onClick={() => format('removeFormat', undefined, { props: [...FX_PROPS] })}
      />
    </div>,
    document.body
  );
}
