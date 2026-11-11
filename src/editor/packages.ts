import { registry } from '@packages/core/PackageRegistry';
import { savePackages } from '@packages/core/storage';
import type { ImportResult } from '@packages/core/types';

/** Grava no IndexedDB os pacotes importados (os incluídos no editor não entram). */
export async function persistCustomPackages(): Promise<void> {
  const ids = registry
    .list()
    .filter((def) => !registry.isBuiltin(def.id))
    .map((def) => def.id);
  await savePackages(registry.serialize(ids)).catch(() => undefined);
}

/** Importa um `.dialcron-pkg.json` e guarda os pacotes para as próximas sessões. */
export async function importPackagesText(text: string): Promise<ImportResult> {
  const result = registry.import(text);
  if (result.imported.length > 0) await persistCustomPackages();
  return result;
}
