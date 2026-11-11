import { ChartPackage } from './chart/ChartPackage';
import { CodePackage } from './code/CodePackage';
import type { PackageRegistry } from './core/PackageRegistry';
import { SimPackage } from './sim/SimPackage';

/**
 * Registra os pacotes embutidos.
 *
 * A ordem importa: o CSS é concatenado nesta sequência.
 * Arquivo protegido pelo contrato — mudanças requerem PR + revisão.
 */
export function registerBuiltins(reg: PackageRegistry): void {
  if (!reg.has(CodePackage.id)) reg.register(CodePackage);
  if (!reg.has(ChartPackage.id)) reg.register(ChartPackage);
  if (!reg.has(SimPackage.id)) reg.register(SimPackage);
}

export { CodePackage, ChartPackage, SimPackage };
