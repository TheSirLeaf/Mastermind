// Menu de contexto (botão direito) do app inteiro. Quem abre passa a lista de itens;
// o menu cuida de posição, teclado (setas, Enter, Esc) e de fechar ao clicar fora.
import { useUIStore, type ContextMenuItem } from '@stores/uiStore';
import { clsx } from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function ContextMenu() {
  const menu = useUIStore((state) => state.contextMenu);
  const close = useUIStore((state) => state.closeContextMenu);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [active, setActive] = useState(-1);

  const items = menu?.items ?? [];
  const actionable = items
    .map((item, index) => ({ item, index }))
    .filter((x) => x.item !== 'separator' && !x.item.disabled)
    .map((x) => x.index);

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    setPos({
      left: Math.max(6, Math.min(menu.x, window.innerWidth - w - 6)),
      top: Math.max(6, Math.min(menu.y, window.innerHeight - h - 6)),
    });
    setActive(-1);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (actionable.length === 0) return;
        const at = actionable.indexOf(active);
        const next =
          event.key === 'ArrowDown'
            ? actionable[(at + 1) % actionable.length]
            : actionable[(at - 1 + actionable.length) % actionable.length];
        setActive(next ?? -1);
      } else if (event.key === 'Enter' && active >= 0) {
        event.preventDefault();
        const item = items[active];
        if (item && item !== 'separator' && !item.disabled) {
          close();
          item.onSelect();
        }
      }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
    };
  });

  if (!menu) return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label="Menu de contexto"
      className="fixed z-[12000] min-w-[220px] rounded-lg border border-white/10 bg-[#19191d] p-1 text-xs text-payday-text shadow-2xl"
      style={{
        left: pos?.left ?? menu.x,
        top: pos?.top ?? menu.y,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item: ContextMenuItem | 'separator', index) =>
        item === 'separator' ? (
          <div key={`sep-${index}`} role="separator" className="my-1 h-px bg-white/10" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onMouseEnter={() => setActive(index)}
            onClick={() => {
              close();
              item.onSelect();
            }}
            className={clsx(
              'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition disabled:opacity-35',
              active === index && !item.disabled && 'bg-white/10',
              item.danger ? 'text-red-300' : ''
            )}
          >
            {item.icon ? (
              <item.icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            ) : (
              <span className="w-3.5" />
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut ? (
              <span className="ml-4 text-[10px] text-payday-textDim">{item.shortcut}</span>
            ) : null}
          </button>
        )
      )}
    </div>,
    document.body
  );
}
