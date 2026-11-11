import { usePackageRegistry } from '@hooks/usePackageRegistry';
import type { PackageDef } from '@packages/core/types';
import { useUIStore } from '@stores/uiStore';
import { Plus, Settings2 } from 'lucide-react';

import { insertPackage } from '../../editor/insertPackage';

export function PackagesPanel() {
  const { listPackages } = usePackageRegistry();
  const { openPackageManager, showToast } = useUIStore();
  const packages = listPackages();

  const handleInsert = (id: string, presetIndex = -1): void => {
    const result = insertPackage(id, presetIndex);
    if (!result) {
      showToast('Não foi possível inserir o elemento no slide.', 'error');
      return;
    }
    showToast(`${result.label} inserido no slide`, 'success');
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-[#F7D98B]">Inserir elemento</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-[#F3E6E2]/50">
          Adiciona um item do pacote ao slide atual. Depois de inserido, clique nele para editar as
          propriedades na aba Pacote.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="rounded border border-white/10 p-3 text-[11px] text-[#F3E6E2]/60">
          Nenhum pacote disponível. Importe ou instale pacotes no gerenciador.
        </div>
      ) : null}

      {packages.map((pkg) => (
        <div key={pkg.id} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#F7D98B]/10 text-[#F7D98B]">
              <PackageGlyph icon={pkg.icon} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-[#F3E6E2]">{pkg.name}</div>
              <div className="truncate text-[10px] text-[#F3E6E2]/45">{pkg.description}</div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded bg-[#F7D98B] px-2 py-1 text-[11px] font-semibold text-[#2A0E1A] transition hover:brightness-110"
              onClick={() => handleInsert(pkg.id)}
              aria-label={`Inserir ${pkg.name}`}
            >
              <Plus className="h-3 w-3" />
              Inserir
            </button>
          </div>

          {pkg.presets && pkg.presets.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {pkg.presets.map((preset, index) => (
                <button
                  key={preset.name}
                  type="button"
                  title={preset.desc}
                  className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-[#F3E6E2]/60 transition hover:border-[#F7D98B]/40 hover:bg-[#F7D98B]/10 hover:text-[#F7D98B]"
                  onClick={() => handleInsert(pkg.id, index)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}

      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-2 rounded border border-white/10 px-3 py-2 text-[11px] text-[#F3E6E2]/70 transition hover:border-[#F7D98B]/40 hover:bg-white/5 hover:text-[#F7D98B]"
        onClick={openPackageManager}
      >
        <Settings2 className="h-3.5 w-3.5" />
        Gerenciar pacotes
      </button>
    </div>
  );
}

function PackageGlyph({ icon }: { icon: PackageDef['icon'] }) {
  if (icon === 'code') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (icon === 'chart' || icon === 'bar-chart-2') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <rect x="7" y="12" width="3" height="6" />
        <rect x="12" y="8" width="3" height="10" />
        <rect x="17" y="4" width="3" height="14" />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
