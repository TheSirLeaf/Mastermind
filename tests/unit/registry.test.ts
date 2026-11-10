import { describe, expect, it } from 'vitest';

import { H } from '../../src/packages/core/helper';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import { serializePackage } from '../../src/packages/core/serialization';
import type { PackageDef } from '../../src/packages/core/types';

function makePackage(id: string, css = ''): PackageDef {
  return {
    id,
    name: id,
    version: '1.0.0',
    icon: 'box',
    defaults: { text: 'oi' },
    form: [{ group: 'Geral', fields: [{ k: 'text', type: 'text' }] }],
    css,
    render: (spec) => String(spec.text ?? ''),
  };
}

describe('PackageRegistry', () => {
  it('registra e lista na ordem de registro', () => {
    const registry = new PackageRegistry();
    registry.register(makePackage('um'));
    registry.register(makePackage('dois'));
    expect(registry.list().map((def) => def.id)).toEqual(['um', 'dois']);
  });

  it('rejeita id duplicado sem replace', () => {
    const registry = new PackageRegistry();
    registry.register(makePackage('um'));
    expect(() => registry.register(makePackage('um'))).toThrow(/já existe/i);
  });

  it('substitui com replace', () => {
    const registry = new PackageRegistry();
    registry.register(makePackage('um'));
    registry.register(makePackage('um', '.x{color:red}'), { replace: true });
    expect(registry.list()).toHaveLength(1);
    expect(registry.css()).toContain('color:red');
  });

  it('concatena CSS na ordem de registro', () => {
    const registry = new PackageRegistry();
    registry.register(makePackage('um', '.um{}'));
    registry.register(makePackage('dois', '.dois{}'));
    expect(registry.css()).toBe('.um{}\n.dois{}');
  });

  it('serializa funções como $fn e preserva o roundtrip', () => {
    const registry = new PackageRegistry();
    const def = makePackage('um');
    registry.register(def);
    const [serialized] = registry.serialize(['um']);
    expect(serialized?.render).toEqual({ $fn: String(def.render) });

    const file = registry.exportFile(['um']);
    expect(file.format).toBe('dialcron-package');

    const target = new PackageRegistry();
    const result = target.import(JSON.stringify(file));
    expect(result.imported.map((item) => item.id)).toEqual(['um']);
    expect(typeof target.get('um')?.render).toBe('function');
    expect(target.get('um')?.render({ text: 'ok' }, H)).toBe('ok');
  });

  it('não sobrescreve pacotes built-in', () => {
    const registry = new PackageRegistry();
    registry.register(makePackage('base'));
    registry.markBuiltin('base');
    const file = {
      format: 'dialcron-package',
      spec: 1,
      packages: [serializePackage(makePackage('base'))],
    };
    const result = registry.import(JSON.stringify(file));
    expect(result.imported).toHaveLength(0);
    expect(result.skipped[0]?.reason).toMatch(/incluído/i);
  });

  it('ignora pacote inválido com motivo', () => {
    const registry = new PackageRegistry();
    const result = registry.import(
      JSON.stringify({ format: 'dialcron-package', spec: 1, packages: [{ id: 'X' }] })
    );
    expect(result.skipped[0]?.reason).toBeTruthy();
  });
});
