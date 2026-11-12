import { usePackageRegistry } from '@hooks/usePackageRegistry';
import { useUIStore } from '@stores/uiStore';
import { Blocks, ChevronUp, Package, Puzzle } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { insertPackage } from '../../editor/insertPackage';
import { Tooltip } from '../common/Tooltip';

import { toolButtonClass } from './ToolButton';

/** Menu "Pacotes ▾": insere um elemento (com modelos) ou abre o gerenciador. */
export function PackagesMenu() {
  const { listPackages } = usePackageRegistry();
  const { openPackageManager, showToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  // O menu fica fora do dock (que rola na horizontal): posição fixa acima do botão.
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setMenuStyle({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 280)),
      bottom: window.innerHeight - rect.top + 8,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const insert = (id: string, presetIndex: number): void => {
    setOpen(false);
    const result = insertPackage(id, presetIndex);
    if (!result) {
      showToast('Não foi possível inserir o elemento no slide.', 'error');
      return;
    }
    showToast(`${result.label} inserido no slide`, 'success');
  };

  const packages = listPackages();

  return (
    <div ref={rootRef} className="relative">
      <Tooltip
        title="Pacotes"
        description="Insere código, gráficos e simulações prontos."
        side="top"
        disabled={open}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          className={toolButtonClass(open)}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex items-center gap-0.5">
            <Blocks className="h-[18px] w-[18px]" />
            <ChevronUp className="h-3 w-3 opacity-60" />
          </span>
          <span className="hidden text-[10px] leading-none 2xl:block">Pacotes</span>
        </button>
      </Tooltip>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[60] max-h-[70vh] min-w-[260px] overflow-auto rounded-xl border border-accent/35 bg-payday-surface p-1.5 shadow-2xl"
              style={menuStyle}
            >
              {packages.map((pkg) => {
                const presets = pkg.presets && pkg.presets.length > 0 ? pkg.presets : null;
                return (
                  <div key={pkg.id}>
                    <div className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[10px] uppercase tracking-widest text-accent">
                      <Package className="h-3 w-3" />
                      {pkg.name}
                    </div>
                    {(presets ?? [{ name: 'Inserir', desc: pkg.description }]).map(
                      (preset, index) => (
                        <button
                          key={`${pkg.id}-${preset.name}`}
                          type="button"
                          role="menuitem"
                          className="block w-full rounded-md px-3 py-1.5 pl-8 text-left text-xs text-payday-text transition hover:bg-accent/15"
                          onClick={() => insert(pkg.id, presets ? index : -1)}
                        >
                          {preset.name}
                          {preset.desc ? (
                            <small className="block text-[11px] text-payday-textMuted">
                              {preset.desc}
                            </small>
                          ) : null}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
              <hr className="my-1.5 border-white/10" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-payday-text transition hover:bg-accent/15"
                onClick={() => {
                  setOpen(false);
                  openPackageManager();
                }}
              >
                <Puzzle className="h-3.5 w-3.5" />
                Gerenciar, importar e exportar…
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
