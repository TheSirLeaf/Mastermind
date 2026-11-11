import { usePackageRegistry } from '@hooks/usePackageRegistry';
import { useUIStore } from '@stores/uiStore';
import { ChevronDown, Package, Puzzle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { insertPackage } from '../../editor/insertPackage';

/** Menu "Pacotes ▾": insere um elemento (com modelos) ou abre o gerenciador. */
export function PackagesMenu() {
  const { listPackages } = usePackageRegistry();
  const { openPackageManager, showToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-[#F7D98B]/40 bg-[#F7D98B]/10 p-1.5 text-[#F7D98B] transition hover:bg-[#F7D98B]/20"
        title="Inserir elementos de pacotes"
        onClick={() => setOpen((value) => !value)}
      >
        <Package className="h-4 w-4" />
        <span className="hidden xl:inline">Pacotes</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-[60] mt-1.5 max-h-[70vh] min-w-[260px] overflow-auto rounded-xl border border-[#F7D98B]/35 bg-payday-surface p-1.5 shadow-2xl"
        >
          {packages.map((pkg) => {
            const presets = pkg.presets && pkg.presets.length > 0 ? pkg.presets : null;
            return (
              <div key={pkg.id}>
                <div className="flex items-center gap-2 px-2.5 pb-1 pt-2 text-[10px] uppercase tracking-widest text-[#F7D98B]">
                  <Package className="h-3 w-3" />
                  {pkg.name}
                </div>
                {(presets ?? [{ name: 'Inserir', desc: pkg.description }]).map((preset, index) => (
                  <button
                    key={`${pkg.id}-${preset.name}`}
                    type="button"
                    role="menuitem"
                    className="block w-full rounded-md px-3 py-1.5 pl-8 text-left text-xs text-payday-text transition hover:bg-[#F7D98B]/15"
                    onClick={() => insert(pkg.id, presets ? index : -1)}
                  >
                    {preset.name}
                    {preset.desc ? (
                      <small className="block text-[11px] text-payday-textMuted">
                        {preset.desc}
                      </small>
                    ) : null}
                  </button>
                ))}
              </div>
            );
          })}
          <hr className="my-1.5 border-white/10" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-payday-text transition hover:bg-[#F7D98B]/15"
            onClick={() => {
              setOpen(false);
              openPackageManager();
            }}
          >
            <Puzzle className="h-3.5 w-3.5" />
            Gerenciar, importar e exportar…
          </button>
        </div>
      ) : null}
    </div>
  );
}
