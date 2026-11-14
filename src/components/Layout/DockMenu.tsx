// Botão do dock que abre uma lista de ações (Mídia, Formas, Efeitos, Alinhar, Camadas…).
import { clsx } from 'clsx';
import { ChevronUp, type LucideIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { Tooltip } from '../common/Tooltip';

import { toolButtonClass } from './ToolButton';

export interface DockMenuItem {
  label: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface DockMenuProps {
  icon: LucideIcon;
  label: string;
  description: string;
  items: Array<DockMenuItem | 'separator'>;
  disabled?: boolean;
}

export function DockMenu({ icon: Icon, label, description, items, disabled }: DockMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  // O dock rola na horizontal: o menu fica fora dele, fixo acima do botão.
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setStyle({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 270)),
      bottom: window.innerHeight - rect.top + 8,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Tooltip title={label} description={description} side="top" disabled={open}>
        <button
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          className={toolButtonClass(open, disabled)}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="flex items-center gap-0.5">
            <Icon className="h-[18px] w-[18px]" />
            <ChevronUp className="h-3 w-3 opacity-60" />
          </span>
          <span className="hidden text-[10px] leading-none 2xl:block">{label}</span>
        </button>
      </Tooltip>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              className="fixed z-[11000] w-[260px] rounded-xl border border-accent/30 bg-payday-surface p-1.5 shadow-2xl"
              style={style}
            >
              {items.map((item, index) =>
                item === 'separator' ? (
                  <div key={`s${index}`} className="my-1 h-px bg-white/10" role="separator" />
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={clsx(
                      'flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition hover:bg-accent/10 disabled:opacity-35'
                    )}
                  >
                    {item.icon ? (
                      <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-payday-text">{item.label}</span>
                      {item.description ? (
                        <span className="block text-[10px] leading-snug text-payday-textDim">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                    {item.shortcut ? (
                      <span className="text-[10px] text-payday-textDim">{item.shortcut}</span>
                    ) : null}
                  </button>
                )
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
