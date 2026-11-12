// components/PackageManager/PackageManagerModal.tsx
import { usePackageRegistry } from '@hooks/usePackageRegistry';
import { ChartPackage } from '@packages/chart';
import { CodePackage } from '@packages/code';
import { exportPackagesFile } from '@packages/core/export';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { X, Download, Upload, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { SVGProps } from 'react';

import { insertPackage } from '../../editor/insertPackage';
import { importPackagesText, persistCustomPackages } from '../../editor/packages';

type SVGIconProps = SVGProps<SVGSVGElement>;

function SearchIcon(props: SVGIconProps) {
  const { className, style, ...rest } = props;
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...rest}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PuzzleIcon(props: SVGIconProps) {
  const { className, style, ...rest } = props;
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...rest}
    >
      <path d="M4 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v4H4z" />
      <path d="M14 8V5a2 2 0 1 1 4 0v3h2v10h-6v-3" />
    </svg>
  );
}

function CodeIcon(props: SVGIconProps) {
  const { className, style, ...rest } = props;
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...rest}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function BarChartIcon(props: SVGIconProps) {
  const { className, style, ...rest } = props;
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...rest}
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function PackageIcon(props: SVGIconProps) {
  const { className, style, ...rest } = props;
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      {...rest}
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export function PackageManagerModal() {
  const { isPackageManagerOpen, closePackageManager, showToast } = useUIStore();
  const { registry, listPackages, getPackageDef, registerPackage } = usePackageRegistry();
  const [, setVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');

  if (!isPackageManagerOpen) return null;

  const packages = listPackages();
  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        setShowImportModal(false);
        setVersion((v) => v + 1);
      }
    } catch {
      showToast('Esse conteúdo não é um pacote válido.', 'error');
    }
  };

  const handleImportFile = async (file: File) => {
    await handleImport(await file.text());
  };

  const customIds = packages.filter((p) => !registry.isBuiltin(p.id)).map((p) => p.id);

  const handleExport = () => {
    // Exporta os pacotes importados; sem nenhum, exporta todos (inclusive built-ins).
    const ids = customIds.length > 0 ? customIds : packages.map((p) => p.id);
    exportPackagesFile(registry, ids);
    showToast('Pacotes exportados', 'success');
  };

  const handleRemove = async (id: string) => {
    if (!registry.unregister(id)) return;
    await persistCustomPackages();
    setSelectedPackage(null);
    setVersion((v) => v + 1);
    showToast('Pacote removido', 'success');
  };

  const handleInsert = (id: string) => {
    // O pacote built-in pode ainda não ter sido registrado (o editor registra
    // no boot); garante o registro antes de inserir.
    const builtin = id === 'code' ? CodePackage : id === 'chart' ? ChartPackage : null;
    if (builtin && !getPackageDef(id)) registerPackage(builtin);
    const result = insertPackage(id);
    if (!result) {
      showToast('Não foi possível inserir o elemento no slide.', 'error');
      return;
    }
    closePackageManager();
    showToast(`${result.label} inserido no slide`, 'success');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={closePackageManager}
    >
      <div
        className="bg-payday-surface border border-payday-border rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-payday-border">
          <h2 className="font-serif text-2xl text-accent flex items-center gap-3">
            <PuzzleIcon />
            Gerenciador de Pacotes
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="rounded p-1.5 text-payday-textMuted hover:bg-payday-surface hover:text-accent transition"
              onClick={handleExport}
              title="Exportar pacotes"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              className="rounded p-1.5 text-payday-textMuted hover:bg-payday-surface hover:text-accent transition"
              onClick={() => setShowImportModal(true)}
              title="Importar pacotes"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              className="rounded p-1.5 text-payday-textMuted hover:bg-payday-surface hover:text-accent transition"
              onClick={closePackageManager}
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-payday-border">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-payday-textMuted/40" />
            <input
              type="text"
              className="w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 pl-10 text-sm text-payday-text outline-none focus:border-accent/40"
              placeholder="Buscar pacotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Package List */}
        <div className="flex-1 overflow-auto p-4">
          {filteredPackages.length === 0 ? (
            <div className="h-full grid place-items-center">
              <div style={{ textAlign: 'center' }}>
                <PackageIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#6d565b' }} />
                <b style={{ display: 'block', color: '#ffffff', marginBottom: '4px' }}>
                  {searchQuery ? 'Nenhum pacote encontrado' : 'Nenhum pacote instalado'}
                </b>
                <p style={{ color: '#b0b0b0', fontSize: '12px' }}>
                  {searchQuery
                    ? 'Tente outro termo de busca'
                    : 'Importe pacotes ou instale built-ins'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPackages.map((pkg) => {
                const def = getPackageDef(pkg.id);
                const isBuiltin = registry.isBuiltin(pkg.id);
                return (
                  <div
                    key={pkg.id}
                    className={clsx(
                      'p-3 rounded-lg border border-transparent hover:border-payday-border transition',
                      selectedPackage === pkg.id && 'ring-2 ring-accent bg-payday-surface'
                    )}
                    onClick={() => setSelectedPackage(selectedPackage === pkg.id ? null : pkg.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-payday-surface flex items-center justify-center">
                        {def?.icon === 'code' ? (
                          <CodeIcon />
                        ) : def?.icon === 'bar-chart-2' ? (
                          <BarChartIcon />
                        ) : (
                          <PackageIcon />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <b className="truncate text-payday-text">
                            {(def?.name as string) || pkg.id}
                          </b>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-accent/20 text-accent">
                            v{(def?.version as string) || '1.0.0'}
                          </span>
                          {isBuiltin && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-payday-surface text-payday-textMuted/60">
                              built-in
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-payday-textMuted/60">
                          {(def?.description as string) || 'Sem descrição'}
                        </p>
                      </div>
                      {!isBuiltin && (
                        <button
                          className="rounded p-1.5 text-payday-textDim/60 hover:bg-payday-surface hover:text-payday-text transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRemove(pkg.id);
                          }}
                          title="Remover pacote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {selectedPackage === pkg.id && def && (
                      <details className="mt-3" open onClick={(e) => e.stopPropagation()}>
                        <summary className="text-[11px] text-[#d6c3c0] cursor-pointer">
                          Detalhes do pacote
                        </summary>
                        <pre className="mt-2 p-3 bg-payday-surface border border-payday-border rounded-lg overflow-auto text-[11px] text-payday-textMuted">
                          {JSON.stringify(
                            {
                              id: def.id,
                              name: def.name,
                              version: def.version,
                              defaults: def.defaults,
                              presets: def.presets,
                              box: def.box,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Built-in packages section */}
        <div className="p-4 border-t border-payday-border">
          <h3 className="text-[11px] uppercase tracking-wider text-accent mb-3">
            Pacotes built-in disponíveis
          </h3>
          <div className="flex gap-3 flex-wrap">
            <button
              className="p-3 rounded-lg border border-payday-border flex-1 min-w-[150px] cursor-pointer hover:bg-payday-surface transition"
              onClick={() => handleInsert('code')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <CodeIcon />
                </div>
                <div>
                  <b className="text-payday-text">Code</b>
                  <div className="text-[11px] text-payday-textMuted/50">
                    Editor de código com syntax highlighting
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-payday-textDim">
                Caixas de código com animação de digitação
              </p>
              <div className="mt-2 flex gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-payday-surface text-payday-textMuted/60">
                  built-in
                </span>
              </div>
            </button>
            <button
              className="p-3 rounded-lg border border-payday-border flex-1 min-w-[150px] cursor-pointer hover:bg-payday-surface transition"
              onClick={() => handleInsert('chart')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <BarChartIcon />
                </div>
                <div>
                  <b className="text-payday-text">Chart</b>
                  <div className="text-[11px] text-payday-textMuted/50">
                    Gráficos: barras, linhas, rosca
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-payday-textDim">Gráficos animados com count-up</p>
              <div className="mt-2 flex gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-payday-surface text-payday-textMuted/60">
                  built-in
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-payday-surface border border-payday-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-payday-border flex items-center justify-between">
              <h3 className="font-serif text-xl text-accent">Importar pacotes</h3>
              <button
                className="rounded p-1.5 text-payday-textMuted hover:bg-payday-surface hover:text-accent transition"
                onClick={() => setShowImportModal(false)}
              >
                <X className="w-4 h-4" />
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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handleImportFile(file);
                }}
              />
              <button
                type="button"
                className="mb-3 rounded border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent transition hover:bg-accent/20"
                onClick={() => fileRef.current?.click()}
              >
                Escolher arquivo .dialcron-pkg.json…
              </button>
              <label className="block text-sm text-payday-textMuted/60 mb-2">
                …ou cole o JSON do pacote
              </label>
              <textarea
                className="w-full min-h-[200px] resize-y rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-sm text-payday-text outline-none focus:border-accent/40 font-mono"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"format": "dialcron-package", "spec": 1, "packages": [ … ]}'
              />
            </div>
            <div className="p-4 border-t border-payday-border flex justify-end gap-2">
              <button
                className="rounded px-4 py-2 text-sm border border-payday-border bg-payday-surface text-payday-text hover:bg-payday-surface transition"
                onClick={() => setShowImportModal(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded px-4 py-2 text-sm font-semibold bg-gradient-to-r from-accent to-accent-dark text-accent-fg border-0 hover:opacity-90 transition"
                onClick={() => void handleImport()}
              >
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
