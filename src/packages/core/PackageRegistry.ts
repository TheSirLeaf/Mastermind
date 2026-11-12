import { createElement, type ComponentType, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { H } from './helper';
import {
  buildPackageFile,
  deserializePackage,
  parsePackageFile,
  serializePackage,
  validatePackage,
} from './serialization';
import type {
  HelperAPI,
  ImportResult,
  PackageDef,
  PackageFile,
  PackageSpec,
  SerializedPackage,
} from './types';

const SAFE_ID = /^[a-z0-9-]+$/i;

/** CSS das transições do pacote, com `.t-in`/`.t-out` trocados pelas classes únicas usadas na apresentação. */
function transitionsCss(def: PackageDef): string {
  return (def.transitions ?? [])
    .filter((t) => SAFE_ID.test(def.id) && SAFE_ID.test(t.id))
    .map((t) =>
      t.css.replace(
        /\.t-(in|out)(-r)?(?![\w-])/g,
        (_m, dir: string, rev: string | undefined) =>
          `.slide.t-${dir}-pk-${def.id}-${t.id}${rev ?? ''}`
      )
    )
    .join('\n');
}

export interface RegisterOptions {
  /** Sobrescreve um pacote existente (usado por pacotes customizados). */
  replace?: boolean;
}

/**
 * Registro central de pacotes.
 *
 * A ordem de registro é significativa: o CSS é concatenado na mesma ordem
 * (a última folha vence em empates de especificidade).
 */
export class PackageRegistry {
  private readonly defs = new Map<string, PackageDef>();
  private readonly order: string[] = [];
  private readonly components = new Map<string, ComponentType<{ spec: PackageSpec }>>();
  private readonly builtin = new Set<string>();

  register(def: PackageDef, options: RegisterOptions = {}): void {
    const error = validatePackage(def);
    if (error) throw new Error(error);
    if (this.defs.has(def.id) && !options.replace) {
      throw new Error(`Já existe um pacote com o id "${def.id}".`);
    }
    if (!this.defs.has(def.id)) this.order.push(def.id);
    this.defs.set(def.id, def);
    this.components.delete(def.id);
    if (!options.replace) this.builtin.add(def.id);
  }

  /** Marca um pacote como built-in (não pode ser sobrescrito por import). */
  markBuiltin(id: string): void {
    this.builtin.add(id);
  }

  isBuiltin(id: string): boolean {
    return this.builtin.has(id);
  }

  /** Remove um pacote importado. Built-ins não podem ser removidos. */
  unregister(id: string): boolean {
    if (this.builtin.has(id) || !this.defs.has(id)) return false;
    this.defs.delete(id);
    this.components.delete(id);
    const at = this.order.indexOf(id);
    if (at >= 0) this.order.splice(at, 1);
    return true;
  }

  get(id: string): PackageDef | undefined {
    return this.defs.get(id);
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }

  list(): PackageDef[] {
    return this.order
      .map((id) => this.defs.get(id))
      .filter((def): def is PackageDef => def !== undefined);
  }

  /** Componente React de preview do pacote (memoizado por id). */
  getComponent(id: string): ComponentType<{ spec: PackageSpec }> | undefined {
    const def = this.defs.get(id);
    if (!def) return undefined;
    let component = this.components.get(id);
    if (!component) {
      component = ({ spec }: { spec: PackageSpec }) => {
        const out: unknown = def.render(spec, H);
        if (typeof out === 'string') {
          return createElement('div', { dangerouslySetInnerHTML: { __html: out } });
        }
        return out as ReactElement;
      };
      this.components.set(id, component);
    }
    return component;
  }

  /** Renderiza o pacote como HTML estático (para inserir no slide/iframe). */
  toHTML(id: string, spec: PackageSpec, h: HelperAPI = H): string {
    const def = this.defs.get(id);
    if (!def) throw new Error(`Pacote desconhecido: ${id}`);
    const out: unknown = def.render(spec, h);
    // Pacotes do editor original (`.dialcron-pkg.json`) devolvem uma string HTML.
    if (typeof out === 'string') return out;
    return renderToStaticMarkup(out as ReactElement);
  }

  /** Transições de slide oferecidas pelos pacotes instalados. */
  listTransitions(): Array<{ value: `pkg:${string}`; label: string; description: string }> {
    return this.list().flatMap((def) =>
      (def.transitions ?? [])
        .filter((t) => SAFE_ID.test(def.id) && SAFE_ID.test(t.id))
        .map((t) => ({
          value: `pkg:${def.id}:${t.id}` as const,
          label: t.name,
          description: `${def.name}${t.description ? ' — ' + t.description : ''}`,
        }))
    );
  }

  /** CSS de todos os pacotes, na ordem de registro. */
  css(): string {
    return this.list()
      .map((def) => [def.css ?? '', transitionsCss(def)].filter(Boolean).join('\n'))
      .filter(Boolean)
      .join('\n');
  }

  /** Serializa os pacotes indicados (padrão: todos). */
  serialize(ids?: string[]): SerializedPackage[] {
    const selected = ids ? ids.map((id) => this.defs.get(id)) : this.list();
    return selected
      .filter((def): def is PackageDef => def !== undefined)
      .map((def) => serializePackage(def));
  }

  /** Arquivo `.dialcron-pkg.json` com os pacotes indicados. */
  exportFile(ids?: string[]): PackageFile {
    const selected = ids ? ids.map((id) => this.defs.get(id)) : this.list();
    return buildPackageFile(selected.filter((def): def is PackageDef => def !== undefined));
  }

  /**
   * Importa um arquivo `.dialcron-pkg.json`.
   * Pacotes built-in não podem ser substituídos.
   */
  import(text: string): ImportResult {
    const imported: PackageDef[] = [];
    const skipped: ImportResult['skipped'] = [];

    for (const serialized of parsePackageFile(text)) {
      const id = serialized.id ?? '?';
      const name = serialized.name ?? '?';
      try {
        if (this.builtin.has(id)) {
          skipped.push({ id, name, reason: 'O id pertence a um pacote incluído no editor.' });
          continue;
        }
        const def = deserializePackage(serialized);
        const error = validatePackage(def);
        if (error) {
          skipped.push({ id, name, reason: error });
          continue;
        }
        this.register(def, { replace: true });
        imported.push(def);
      } catch (err) {
        skipped.push({
          id,
          name,
          reason: err instanceof Error ? err.message : 'Falha ao ler o pacote.',
        });
      }
    }

    return { imported, skipped };
  }

  clear(): void {
    this.defs.clear();
    this.order.length = 0;
    this.components.clear();
    this.builtin.clear();
  }
}

/** Registro padrão da aplicação. */
export const registry = new PackageRegistry();
