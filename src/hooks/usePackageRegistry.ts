// hooks/usePackageRegistry.ts
import { registry } from '@packages/core/PackageRegistry';
import type { PackageDef } from '@packages/core/types';
import { useMemo } from 'react';

export function usePackageRegistry() {
  const registryInstance = useMemo(() => registry, []);

  return {
    registry: registryInstance,
    listPackages: () => registryInstance.list(),
    getPackageDef: (id: string) => registryInstance.get(id),
    getComponent: (id: string) => registryInstance.getComponent(id),
    getFormSchema: (id: string) => registryInstance.get(id)?.form,
    getDefaults: (id: string) => registryInstance.get(id)?.defaults,
    getPresets: (id: string) => registryInstance.get(id)?.presets,
    getCss: (id: string) => registryInstance.get(id)?.css,
    getRuntime: (id: string) => registryInstance.get(id)?.runtime,
    getDuration: (id: string) => registryInstance.get(id)?.duration,
    getBox: (id: string) => registryInstance.get(id)?.box,
    getIcon: (id: string) => registryInstance.get(id)?.icon,
    getDescription: (id: string) => registryInstance.get(id)?.description,
    registerPackage: (def: PackageDef) => registryInstance.register(def),
    importPackage: (json: string) => registryInstance.import(json),
    exportPackages: (ids: string[]) => registryInstance.serialize(ids),
  };
}
