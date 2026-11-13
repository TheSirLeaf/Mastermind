// components/PackageManager/PackageManagerModal.tsx
// Gerenciador de pacotes: busca, categorias, filtros, grade/lista e painel de detalhes.
import { usePackageRegistry } from '@hooks/usePackageRegistry';
import { exportPackagesFile } from '@packages/core/export';
import type { PackageDef } from '@packages/core/types';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import {
  BarChart3,
  Code2,
  Download,
  LayoutGrid,
  List,
  MonitorPlay,
  Package,
  Plus,
  QrCode,
  Search,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { insertPackage } from '../../editor/insertPackage';
import { importPackagesText, persistCustomPackages } from '../../editor/packages';

const ICONS: Record<string, LucideIcon> = {
  code: Code2,
  chart: BarChart3,
  'bar-chart-2': BarChart3,
  'monitor-play': MonitorPlay,
  'qr-code': QrCode,
};

const OTHER = 'Outros';
type Filter =
  { kind: 'all' } | { kind: 'category'; value: string } | { kind: 'custom' } | { kind: 'builtin' };
type Sort = 'name' | 'category';

function iconOf(def: PackageDef): LucideIcon {
  return ICONS[def.icon] ?? Package;
}

const categoryOf = (def: PackageDef): string => def.category?.trim() || OTHER;

export function PackageManagerModal() {
  const { isPackageManagerOpen, closePackageManager, showToast } = useUIStore();
  const { registry, listPackages } = usePackageRegistry();
  const [version, setVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [sort, setSort] = useState<Sort>('name');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  useEffect(() => {
    if (!isPackageManagerOpen) return;
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showImport) setShowImport(false);
      else closePackageManager();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPackageManagerOpen, showImport, closePackageManager]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const packages = useMemo(() => listPackages(), [version, isPackageManagerOpen]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pkg of packages) counts.set(categoryOf(pkg), (counts.get(categoryOf(pkg)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
  }, [packages]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = packages.filter((pkg) => {
      if (filter.kind === 'category' && categoryOf(pkg) !== filter.value) return false;
      if (filter.kind === 'custom' && registry.isBuiltin(pkg.id)) return false;
      if (filter.kind === 'builtin' && !registry.isBuiltin(pkg.id)) return false;
      if (!needle) return true;
      return [pkg.id, pkg.name, pkg.description ?? '', categoryOf(pkg), pkg.author ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    return list.sort((a, b) =>
      sort === 'category'
        ? categoryOf(a).localeCompare(categoryOf(b), 'pt-BR') ||
          a.name.localeCompare(b.name, 'pt-BR')
        : a.name.localeCompare(b.name, 'pt-BR')
    );
  }, [packages, query, filter, sort, registry]);

  if (!isPackageManagerOpen) return null;

  const selected = packages.find((p) => p.id === selectedId) ?? null;
  const customCount = packages.filter((p) => !registry.isBuiltin(p.id)).length;

  const handleImport = async (text: string = importJson) => {
    try {
      const result = await importPackagesText(text);
      const imported = result.imported.map((p) => p.name).join(', ');
      const skipped = result.skipped.map((s) => `${s.name} (${s.reason})`).join('; ');
      if (imported) showToast(`Importados: ${imported}`, 'success');
      if (skipped) showToast(`Ignorados: ${skipped}`, 'error');
      if (!imported && !skipped) showToast('Nenhum pacote encontrado no arquivo.', 'error');
      if (result.imported.length > 0) {
        setImportJson('');
        setShowImport(false);
        setVersion((v) => v + 1);
      }
    } catch {
      showToast('Esse conteúdo não é um pacote válido.', 'error');
    }
  };

  const handleExport = (ids?: string[]) => {
    const custom = packages.filter((p) => !registry.isBuiltin(p.id)).map((p) => p.id);
    const list = ids ?? (custom.length > 0 ? custom : packages.map((p) => p.id));
    exportPackagesFile(registry, list);
    showToast('Pacotes exportados', 'success');
  };

  const handleRemove = async (id: string) => {
    if (!registry.unregister(id)) return;
    await persistCustomPackages();
    setSelectedId(null);
    setVersion((v) => v + 1);
    showToast('Pacote removido', 'success');
  };

  const handleInsert = (id: string, presetIndex = -1) => {
    const result = insertPackage(id, presetIndex);
    if (!result) {
      showToast('Não foi possível inserir o elemento no slide.', 'error');
      return;
    }
    closePackageManager();
    showToast(`${result.label} inserido no slide`, 'success');
  };

  const filterButton = (label: string, count: number, active: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition',
        active ? 'bg-accent/15 text-accent' : 'text-payday-textMuted hover:bg-white/5'
      )}
    >
      <span className="truncate">{label}</span>
      <span className="ml-2 text-[10px] text-payday-textDim">{count}</span>
    </button>
  );

  const isFilter = (kind: Filter['kind'], value?: string) =>
    filter.kind === kind && (filter.kind !== 'category' || filter.value === value);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={closePackageManager}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gerenciador de pacotes"
        className="flex h-[min(720px,92vh)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-payday-border bg-payday-surface"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-payday-border px-4 py-3">
          <Package className="h-5 w-5 text-accent" />
          <h2 className="font-serif text-xl text-accent">Pacotes</h2>
          <span className="text-xs text-payday-textDim">{packages.length} instalados</span>
          <div className="relative ml-4 max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-payday-textDim" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome, descrição, categoria ou autor…"
              aria-label="Buscar pacotes"
              className="w-full rounded border border-payday-border bg-payday-bg py-1.5 pl-8 pr-2 text-sm text-payday-text outline-none focus:border-accent/40"
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded border border-payday-border px-2.5 py-1.5 text-xs text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
              onClick={() => setShowImport(true)}
            >
              <Upload className="h-3.5 w-3.5" /> Importar
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded border border-payday-border px-2.5 py-1.5 text-xs text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
              onClick={() => handleExport()}
              title={customCount > 0 ? 'Exporta os pacotes importados' : 'Exporta todos os pacotes'}
            >
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
            <button
              type="button"
              aria-label="Fechar"
              className="rounded p-1.5 text-payday-textMuted transition hover:bg-white/10 hover:text-accent"
              onClick={closePackageManager}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav className="w-52 shrink-0 space-y-4 overflow-auto border-r border-payday-border bg-payday-bg/50 p-3">
            <div className="space-y-0.5">
              {filterButton('Todos', packages.length, isFilter('all'), () =>
                setFilter({ kind: 'all' })
              )}
              {filterButton('Importados', customCount, isFilter('custom'), () =>
                setFilter({ kind: 'custom' })
              )}
              {filterButton('Built-in', packages.length - customCount, isFilter('builtin'), () =>
                setFilter({ kind: 'builtin' })
              )}
            </div>
            <div>
              <div className="mb-1 px-2.5 text-[10px] uppercase tracking-widest text-payday-textDim">
                Categorias
              </div>
              <div className="space-y-0.5">
                {categories.map(([name, count]) =>
                  filterButton(name, count, isFilter('category', name), () =>
                    setFilter({ kind: 'category', value: name })
                  )
                )}
              </div>
            </div>
          </nav>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-payday-border px-4 py-2 text-xs text-payday-textMuted">
              <span>
                {visible.length} pacote{visible.length === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Ordenar"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as Sort)}
                  className="rounded border border-payday-border bg-payday-bg px-1.5 py-1 text-xs text-payday-text"
                >
                  <option value="name">Ordenar por nome</option>
                  <option value="category">Ordenar por categoria</option>
                </select>
                <div className="flex rounded border border-payday-border p-0.5">
                  {(
                    [
                      ['grid', 'Grade', LayoutGrid],
                      ['list', 'Lista', List],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={label}
                      aria-pressed={view === value}
                      onClick={() => setView(value)}
                      className={clsx(
                        'rounded p-1 transition',
                        view === value ? 'bg-accent/20 text-accent' : 'hover:bg-white/5'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {visible.length === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm text-payday-textMuted">
                  <div>
                    <Package className="mx-auto mb-2 h-10 w-10 text-payday-textDim" />
                    {query || filter.kind !== 'all'
                      ? 'Nenhum pacote encontrado com esses filtros.'
                      : 'Nenhum pacote instalado. Use Importar para adicionar.'}
                  </div>
                </div>
              ) : (
                <div
                  className={clsx(
                    view === 'grid' ? 'grid grid-cols-2 gap-3 lg:grid-cols-3' : 'space-y-1.5'
                  )}
                >
                  {visible.map((pkg) => {
                    const Icon = iconOf(pkg);
                    const active = selectedId === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedId(active ? null : pkg.id)}
                        className={clsx(
                          'text-left transition',
                          view === 'grid'
                            ? 'flex flex-col gap-2 rounded-xl border p-3'
                            : 'flex items-center gap-3 rounded-lg border px-3 py-2',
                          active
                            ? 'border-accent/70 bg-accent/10'
                            : 'border-payday-border hover:border-accent/40 hover:bg-white/5'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-accent">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-payday-text">
                              {pkg.name}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-payday-textDim">
                              {categoryOf(pkg)} · v{pkg.version}
                            </div>
                          </div>
                        </div>
                        <p
                          className={clsx(
                            'text-[11px] leading-snug text-payday-textMuted',
                            view === 'grid' ? 'line-clamp-3' : 'line-clamp-1 flex-1'
                          )}
                        >
                          {pkg.description || 'Sem descrição'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="w-72 shrink-0 overflow-auto border-l border-payday-border bg-payday-bg/40 p-4">
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-accent">
                    {(() => {
                      const Icon = iconOf(selected);
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-payday-text">
                      {selected.name}
                    </h3>
                    <p className="text-[11px] text-payday-textDim">
                      {categoryOf(selected)} · v{selected.version}
                      {registry.isBuiltin(selected.id) ? ' · built-in' : ''}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-payday-textMuted">
                  {selected.description || 'Sem descrição'}
                </p>
                <dl className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded border border-payday-border p-2">
                    <dt className="text-payday-textDim">Modelos</dt>
                    <dd className="text-payday-text">{selected.presets?.length ?? 0}</dd>
                  </div>
                  <div className="rounded border border-payday-border p-2">
                    <dt className="text-payday-textDim">Transições</dt>
                    <dd className="text-payday-text">{selected.transitions?.length ?? 0}</dd>
                  </div>
                  <div className="col-span-2 rounded border border-payday-border p-2">
                    <dt className="text-payday-textDim">Autor</dt>
                    <dd className="text-payday-text">{selected.author || '—'}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => handleInsert(selected.id)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-accent px-3 py-2 text-xs font-semibold text-accent-fg transition hover:brightness-110"
                >
                  <Plus className="h-3.5 w-3.5" /> Inserir no slide
                </button>

                {selected.presets && selected.presets.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-widest text-payday-textDim">
                      Modelos
                    </div>
                    <ul className="max-h-48 space-y-0.5 overflow-auto">
                      {selected.presets.map((preset, index) => (
                        <li key={preset.name}>
                          <button
                            type="button"
                            title={preset.desc}
                            onClick={() => handleInsert(selected.id, index)}
                            className="w-full truncate rounded px-2 py-1 text-left text-xs text-payday-textMuted transition hover:bg-accent/10 hover:text-accent"
                          >
                            {preset.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selected.transitions && selected.transitions.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-widest text-payday-textDim">
                      Transições de slide
                    </div>
                    <ul className="space-y-0.5 text-xs text-payday-textMuted">
                      {selected.transitions.map((t) => (
                        <li key={t.id} className="px-2 py-0.5">
                          {t.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleExport([selected.id])}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-payday-border px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
                  >
                    <Download className="h-3 w-3" /> Exportar
                  </button>
                  {!registry.isBuiltin(selected.id) ? (
                    <button
                      type="button"
                      onClick={() => void handleRemove(selected.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-red-400/40 px-2 py-1.5 text-[11px] text-red-300 transition hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3 w-3" /> Remover
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center text-center text-xs text-payday-textDim">
                Selecione um pacote para ver detalhes, modelos e inserir no slide.
              </div>
            )}
          </aside>
        </div>
      </div>

      {showImport ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={(event) => {
            event.stopPropagation();
            setShowImport(false);
          }}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-payday-border bg-payday-surface"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-payday-border p-4">
              <h3 className="font-serif text-xl text-accent">Importar pacotes</h3>
              <button
                type="button"
                aria-label="Fechar"
                className="rounded p-1.5 text-payday-textMuted transition hover:text-accent"
                onClick={() => setShowImport(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void file.text().then((text) => handleImport(text));
                }}
              />
              <button
                type="button"
                className="mb-3 rounded border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent transition hover:bg-accent/20"
                onClick={() => fileRef.current?.click()}
              >
                Escolher arquivo .dialcron-pkg.json…
              </button>
              <label className="mb-2 block text-sm text-payday-textMuted">
                …ou cole o JSON do pacote
              </label>
              <textarea
                className="min-h-[200px] w-full resize-y rounded border border-payday-border bg-payday-bg px-2 py-1.5 font-mono text-sm text-payday-text outline-none focus:border-accent/40"
                value={importJson}
                onChange={(event) => setImportJson(event.target.value)}
                placeholder='{"format": "dialcron-package", "spec": 1, "packages": [ … ]}'
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-payday-border p-4">
              <button
                type="button"
                className="rounded border border-payday-border px-4 py-2 text-sm text-payday-text transition hover:bg-white/5"
                onClick={() => setShowImport(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:brightness-110"
                onClick={() => void handleImport()}
              >
                Importar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
