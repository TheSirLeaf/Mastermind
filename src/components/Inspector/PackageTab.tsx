// components/Inspector/PackageTab.tsx
import { FormGenerator } from '@components/Inspector/forms/FormGenerator';
import { usePackageRegistry } from '@hooks/usePackageRegistry';
import type { SelectionInfo } from '@packages/core/types';

import { mutateSelectedElement, readSelectedElement } from './elementSelection';
import { EmptyState } from './EmptyState';

interface PackageTabProps {
  selection: SelectionInfo;
}

export function PackageTab({ selection }: PackageTabProps) {
  const { getPackageDef, getFormSchema } = usePackageRegistry();
  const element = readSelectedElement(selection);
  const packageId = element?.getAttribute('data-pkg') ?? selection.label;

  const pkgDef = getPackageDef(packageId);
  const formSchema = getFormSchema(packageId);

  if (!pkgDef) {
    return <EmptyState message={`Pacote "${packageId}" não encontrado`} icon="package" />;
  }

  if (!formSchema || formSchema.length === 0) {
    return <EmptyState message="Este pacote não define campos de formulário" icon="package" />;
  }

  const currentSpec = getElementSpec(element);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded border border-white/10 bg-white/5 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F7D98B]/10">
          <svg
            className="h-5 w-5 text-[#F7D98B]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[#F3E6E2]">{pkgDef.name}</div>
          <div className="text-[11px] text-[#F3E6E2]/50">
            v{pkgDef.version} · {pkgDef.id}
          </div>
          {pkgDef.description ? (
            <div className="mt-1 text-[11px] text-[#F3E6E2]/60">{pkgDef.description}</div>
          ) : null}
        </div>
      </div>

      <FormGenerator
        key={selection.path.join('.')}
        schema={formSchema}
        spec={currentSpec}
        onChange={(newSpec) => updatePackageSpec(selection, newSpec)}
      />
    </div>
  );
}

function getElementSpec(element: Element | null): Record<string, unknown> {
  const specAttr = element?.getAttribute('data-spec');
  if (!specAttr) return {};
  try {
    const parsed: unknown = JSON.parse(specAttr);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function updatePackageSpec(selection: SelectionInfo, newSpec: Record<string, unknown>): void {
  mutateSelectedElement(selection, (element) => {
    element.setAttribute('data-spec', JSON.stringify(newSpec));
  });
}
