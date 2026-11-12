// components/Inspector/PackageTab.tsx
import { FormGenerator } from '@components/Inspector/forms/FormGenerator';
import { usePackageRegistry } from '@hooks/usePackageRegistry';
import type { SelectionInfo } from '@packages/core/types';
import { useMemo } from 'react';

import { readSelectedElement } from './elementSelection';
import { EmptyState } from './EmptyState';
import { PackagePicker } from './PackagePicker';
import { getElementSpec, updatePackageSpec } from './packageSpec';

interface PackageTabProps {
  selection: SelectionInfo | null;
  /** `style`: dados e aparência (Editor). `animation`: opções de animação (Animação). */
  mode?: 'style' | 'animation';
}

export function PackageTab({ selection, mode = 'style' }: PackageTabProps) {
  const element = selection ? readSelectedElement(selection) : null;
  // Sem pacote selecionado, a aba serve para adicionar um.
  if (!selection || !element?.hasAttribute('data-pkg')) return <PackagePicker />;
  return <PackageEditor selection={selection} element={element} mode={mode} />;
}

function PackageEditor({
  selection,
  element,
  mode,
}: {
  selection: SelectionInfo;
  element: Element;
  mode: 'style' | 'animation';
}) {
  const { getPackageDef, getFormSchema } = usePackageRegistry();
  const packageId = element.getAttribute('data-pkg') ?? selection.label;

  const pkgDef = getPackageDef(packageId);
  const fullSchema = getFormSchema(packageId);
  const formSchema = useMemo(
    () => fullSchema?.filter((group) => (group.workspace ?? 'style') === mode),
    [fullSchema, mode]
  );

  if (!pkgDef) {
    return <EmptyState message={`Pacote "${packageId}" não encontrado`} icon="package" />;
  }

  if (!formSchema || formSchema.length === 0) {
    return (
      <EmptyState
        message={
          mode === 'animation'
            ? 'Este pacote não tem opções de animação'
            : 'Este pacote não define campos de formulário'
        }
        icon="package"
      />
    );
  }

  const currentSpec = getElementSpec(element);

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-start gap-3 rounded border border-white/10 bg-white/5 p-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <svg
            className="h-5 w-5 text-accent"
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
          <div className="font-medium text-payday-text">{pkgDef.name}</div>
          <div className="text-[11px] text-payday-text/50">
            v{pkgDef.version} · {pkgDef.id}
          </div>
          {pkgDef.description ? (
            <div className="mt-1 text-[11px] text-payday-text/60">{pkgDef.description}</div>
          ) : null}
        </div>
      </div>

      <FormGenerator
        key={`${selection.path.join('.')}:${mode}`}
        schema={formSchema}
        spec={currentSpec}
        onChange={(newSpec) => updatePackageSpec(selection, newSpec)}
      />
    </div>
  );
}
