import type { PackageDef, PackageFile, SerializedPackage } from './types';

/**
 * Serializa um pacote no formato `.dialcron-pkg.json`.
 *
 * Compatível com o editor monolítico: funções viram `{ $fn: "código" }`,
 * chaves privadas (`_*`) e `custom` não são exportadas.
 */
export function serializePackage(def: PackageDef): SerializedPackage {
  const json = JSON.stringify(def, (key, value: unknown) => {
    if (typeof value === 'function') return { $fn: String(value) };
    if (key.startsWith('_') || key === 'custom') return undefined;
    return value;
  });
  return JSON.parse(json) as SerializedPackage;
}

/** Compila uma função serializada. */
export function compileFunction(source: string): (...args: never[]) => unknown {
  // O JSON de pacotes é confiável apenas quando importado de fonte conhecida.
  // Esta é a mesma política do editor original (executa código do pacote).
  return new Function(`return (${source})`)() as (...args: never[]) => unknown;
}

/** Revive funções `{ $fn }` em um objeto desserializado. */
export function reviveValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviveValue);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$fn === 'string') return compileFunction(obj.$fn);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = reviveValue(v);
    return out;
  }
  return value;
}

/** Desserializa um único pacote. */
export function deserializePackage(input: SerializedPackage | string): PackageDef {
  const raw = typeof input === 'string' ? (JSON.parse(input) as unknown) : input;
  return reviveValue(raw) as PackageDef;
}

/** Monta o arquivo exportável com um ou mais pacotes. */
export function buildPackageFile(defs: PackageDef[]): PackageFile {
  return {
    format: 'dialcron-package',
    spec: 1,
    packages: defs.map(serializePackage),
  };
}

/** Lê um arquivo `.dialcron-pkg.json` (aceita pacote avulso). */
export function parsePackageFile(text: string): SerializedPackage[] {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Arquivo de pacote inválido.');
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.format === 'dialcron-package' && Array.isArray(obj.packages)) {
    return obj.packages as SerializedPackage[];
  }
  if (Array.isArray(parsed)) return parsed as SerializedPackage[];
  return [parsed as SerializedPackage];
}

/** Validação mínima de um pacote. Retorna mensagem de erro ou string vazia. */
export function validatePackage(def: PackageDef): string {
  if (!def || typeof def !== 'object') return 'Arquivo sem pacote.';
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(def.id ?? '')) {
    return 'O id do pacote deve ter letras minúsculas, números e hífens (ex.: meu-pacote).';
  }
  if (!def.name) return 'O pacote precisa de um nome.';
  if (!def.version) return 'O pacote precisa de uma versão.';
  if (typeof def.render !== 'function') return 'O pacote precisa de uma função render(spec, h).';
  if (!Array.isArray(def.form)) return 'O pacote precisa de um formulário (form).';
  return '';
}
