// components/Inspector/PackagePicker.tsx
// Insere um pacote no slide. Compacto: busca + lista com os modelos recolhidos por pacote.
import { usePackageRegistry } from '@hooks/usePackageRegistry';
import { useUIStore } from '@stores/uiStore';
import { ChevronRight, Plus, Search, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { insertPackage } from '../../editor/insertPackage';

export function PackagePicker() {
  const { listPackages } = usePackageRegistry();
  const { openPackageManager, showToast } = useUIStore();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const packages = listPackages();
  const needle = query.trim().toLowerCase();

  const rows = useMemo(
    () =>
      packages
        .map((pkg) => {
          const presets = (pkg.presets ?? []).map((preset, index) => ({ preset, index }));
          const matchesPackage =
            !needle ||
            pkg.name.toLowerCase().includes(needle) ||
            pkg.id.toLowerCase().includes(needle) ||
            (pkg.description ?? '').toLowerCase().includes(needle);
          const visible = matchesPackage
            ? presets
            : presets.filter(({ preset }) => preset.name.toLowerCase().includes(needle));
          return { pkg, presets: visible, show: matchesPackage || visible.length > 0 };
        })
        .filter((row) => row.show),
    [packages, needle]
  );

  const insert = (id: string, presetIndex = -1): void => {
    const result = insertPackage(id, presetIndex);
    if (!result) {
      showToast('Não foi possível inserir o elemento no slide.', 'error');
      return;
    }
    showToast(`${result.label} inserido no slide`, 'success');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-payday-border p-3">
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-accent">Adicionar pacote</h3>
          <p className="mt-1 text-[11px] leading-snug text-payday-textMuted">
            Nenhum pacote selecionado. Escolha um para inserir no slide, ou clique em um pacote já
            inserido para editá-lo.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-payday-textDim" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar pacote ou modelo…"
            aria-label="Buscar pacote"
            className="w-full rounded border border-payday-border bg-payday-surface py-1.5 pl-7 pr-2 text-xs text-payday-text outline-none focus:border-accent/40"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {rows.length === 0 ? (
          <div className="p-3 text-center text-[11px] text-payday-textDim">
            {packages.length === 0
              ? 'Nenhum pacote instalado. Use o gerenciador para importar.'
              : 'Nada encontrado.'}
          </div>
        ) : null}

        {rows.map(({ pkg, presets }) => {
          const expanded = needle ? presets.length > 0 : openId === pkg.id;
          const total = pkg.presets?.length ?? 0;
          return (
            <div key={pkg.id} className="mb-1 rounded-md border border-payday-border/70">
              <div className="flex items-center gap-1 p-1.5">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`Modelos de ${pkg.name}`}
                  disabled={presets.length === 0}
                  onClick={() => setOpenId(expanded ? null : pkg.id)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded text-payday-textMuted transition hover:bg-white/10 disabled:opacity-25"
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-payday-text">{pkg.name}</div>
                  <div className="truncate text-[10px] text-payday-textDim">
                    {total > 0
                      ? `${total} modelo${total === 1 ? '' : 's'}`
                      : (pkg.description ?? '')}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Inserir ${pkg.name}`}
                  onClick={() => insert(pkg.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded bg-accent px-2 py-1 text-[11px] font-semibold text-accent-fg transition hover:brightness-110"
                >
                  <Plus className="h-3 w-3" />
                  Inserir
                </button>
              </div>

              {expanded ? (
                <ul className="max-h-52 overflow-auto border-t border-payday-border/60 py-1">
                  {presets.map(({ preset, index }) => (
                    <li key={preset.name}>
                      <button
                        type="button"
                        onClick={() => insert(pkg.id, index)}
                        title={preset.desc}
                        className="flex w-full flex-col px-3 py-1 text-left transition hover:bg-accent/10"
                      >
                        <span className="truncate text-xs text-payday-text">{preset.name}</span>
                        {preset.desc ? (
                          <span className="truncate text-[10px] text-payday-textDim">
                            {preset.desc}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-payday-border p-2">
        <button
          type="button"
          onClick={openPackageManager}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-payday-border px-3 py-1.5 text-[11px] text-payday-textMuted transition hover:border-accent/40 hover:text-accent"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Gerenciar pacotes
        </button>
      </div>
    </div>
  );
}
