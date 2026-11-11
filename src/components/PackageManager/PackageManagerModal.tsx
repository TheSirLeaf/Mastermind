// components/PackageManager/PackageManagerModal.tsx
import { usePackageRegistry } from '@hooks/usePackageRegistry';
import { ChartPackage } from '@packages/chart';
import { CodePackage } from '@packages/code';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { X, Download, Upload, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SVGProps } from 'react';

import { insertPackage } from '../../editor/insertPackage';

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
  const { listPackages, getPackageDef, importPackage, exportPackages, registerPackage } =
    usePackageRegistry();
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

  const handleImport = async () => {
    try {
      const result = await importPackage(importJson);
      const imported = result.imported.map((p) => p.id).join(', ') || 'nenhum';
      const skipped = result.skipped.map((s) => s.id).join(', ') || 'nenhum';
      showToast(`Importados: ${imported}\nIgnorados: ${skipped}`, 'success');
      if (result.imported.length > 0) setImportJson('');
      setShowImportModal(false);
    } catch (e) {
      showToast('Erro ao importar: ' + e, 'error');
    }
  };

  const handleExport = () => {
    const ids = packages.map((p) => p.id);
    const exported = exportPackages(ids);
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'packages.dialcron-pkg.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Pacotes exportados', 'success');
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
        className="bg-[#1A0A12] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-serif text-2xl text-[#F7D98B] flex items-center gap-3">
            <PuzzleIcon />
            Gerenciador de Pacotes
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="rounded p-1.5 text-[#F3E6E2]/60 hover:bg-white/10 hover:text-[#F7D98B] transition"
              onClick={handleExport}
              title="Exportar pacotes"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              className="rounded p-1.5 text-[#F3E6E2]/60 hover:bg-white/10 hover:text-[#F7D98B] transition"
              onClick={() => setShowImportModal(true)}
              title="Importar pacotes"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              className="rounded p-1.5 text-[#F3E6E2]/60 hover:bg-white/10 hover:text-[#F7D98B] transition"
              onClick={closePackageManager}
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F3E6E2]/40" />
            <input
              type="text"
              className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 pl-10 text-sm text-[#F3E6E2] outline-none focus:border-[#F7D98B]/40"
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
                <b style={{ display: 'block', color: '#F3E6E2', marginBottom: '4px' }}>
                  {searchQuery ? 'Nenhum pacote encontrado' : 'Nenhum pacote instalado'}
                </b>
                <p style={{ color: '#a88f92', fontSize: '12px' }}>
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
                const isBuiltin = ['code', 'chart'].includes(pkg.id);
                return (
                  <div
                    key={pkg.id}
                    className={clsx(
                      'p-3 rounded-lg border border-transparent hover:border-white/10 transition',
                      selectedPackage === pkg.id && 'ring-2 ring-[#F7D98B] bg-white/5'
                    )}
                    onClick={() => setSelectedPackage(selectedPackage === pkg.id ? null : pkg.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
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
                          <b className="truncate text-[#F3E6E2]">
                            {(def?.name as string) || pkg.id}
                          </b>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#F7D98B]/20 text-[#F7D98B]">
                            v{(def?.version as string) || '1.0.0'}
                          </span>
                          {isBuiltin && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-[#F3E6E2]/60">
                              built-in
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm text-[#F3E6E2]/60">
                          {(def?.description as string) || 'Sem descrição'}
                        </p>
                      </div>
                      {!isBuiltin && (
                        <button
                          className="rounded p-1.5 text-[#C77C8A]/60 hover:bg-[#C77C8A]/10 hover:text-[#C77C8A] transition"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          title="Remover pacote"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {selectedPackage === pkg.id && def && (
                      <details className="mt-3">
                        <summary className="text-[11px] text-[#d6c3c0] cursor-pointer">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 p-3 bg-black/20 border border-white/10 rounded-lg overflow-auto text-[11px] text-[#d6c3c0]">
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
        <div className="p-4 border-t border-white/10">
          <h3 className="text-[11px] uppercase tracking-wider text-[#F7D98B] mb-3">
            Pacotes built-in disponíveis
          </h3>
          <div className="flex gap-3 flex-wrap">
            <button
              className="p-3 rounded-lg border border-white/10 flex-1 min-w-[150px] cursor-pointer hover:bg-white/5 transition"
              onClick={() => handleInsert('code')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <CodeIcon />
                </div>
                <div>
                  <b className="text-[#F3E6E2]">Code</b>
                  <div className="text-[11px] text-[#F3E6E2]/50">
                    Editor de código com syntax highlighting
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-[#a88f92]">
                Caixas de código com animação de digitação
              </p>
              <div className="mt-2 flex gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-[#F3E6E2]/60">
                  built-in
                </span>
              </div>
            </button>
            <button
              className="p-3 rounded-lg border border-white/10 flex-1 min-w-[150px] cursor-pointer hover:bg-white/5 transition"
              onClick={() => handleInsert('chart')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <BarChartIcon />
                </div>
                <div>
                  <b className="text-[#F3E6E2]">Chart</b>
                  <div className="text-[11px] text-[#F3E6E2]/50">
                    Gráficos: barras, linhas, rosca
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-[#a88f92]">Gráficos animados com count-up</p>
              <div className="mt-2 flex gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-[#F3E6E2]/60">
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
            className="bg-[#1A0A12] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-serif text-xl text-[#F7D98B]">Importar pacotes</h3>
              <button
                className="rounded p-1.5 text-[#F3E6E2]/60 hover:bg-white/10 hover:text-[#F7D98B] transition"
                onClick={() => setShowImportModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm text-[#F3E6E2]/60 mb-2">
                Cole o JSON do pacote (.dialcron-pkg.json)
              </label>
              <textarea
                className="w-full min-h-[200px] resize-y rounded border border-white/10 bg-black/20 px-2 py-1.5 text-sm text-[#F3E6E2] outline-none focus:border-[#F7D98B]/40 font-mono"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"id": "meu-pacote", "name": "Meu Pacote", "version": "1.0.0", "icon": "package", "defaults": {}, "form": [], "css": "", "runtime": ""}]'
              />
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
              <button
                className="rounded px-4 py-2 text-sm border border-white/10 bg-white/5 text-[#F3E6E2] hover:bg-white/10 transition"
                onClick={() => setShowImportModal(false)}
              >
                Cancelar
              </button>
              <button
                className="rounded px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#F7D98B] to-[#D6A84F] text-[#2A0E1A] border-0 hover:opacity-90 transition"
                onClick={handleImport}
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
