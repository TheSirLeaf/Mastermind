import { buildRegistryPayload } from '@packages/core/export';
import { DECK_FRAME_SANDBOX } from '@packages/core/frameSandbox';
import { PackageRegistry } from '@packages/core/PackageRegistry';
import type { PackageDef } from '@packages/core/types';
import { registerBuiltins } from '@packages/index';
import { describe, expect, it } from 'vitest';

const imported: PackageDef = {
  id: 'de-fora',
  name: 'De fora',
  version: '1.0.0',
  icon: 'box',
  defaults: {},
  form: [],
  render: () => '<p>oi</p>',
  runtime: () => null,
  transitions: [{ id: 'voo', name: 'Voo', scene: () => null }],
};

function registryWithImported(): PackageRegistry {
  const reg = new PackageRegistry();
  registerBuiltins(reg);
  reg.register(imported, { replace: true });
  return reg;
}

describe('isolamento de pacotes importados', () => {
  it('o palco do editor recebe o pacote importado sem runtime nem scene', () => {
    const reg = registryWithImported();
    const payload = JSON.parse(
      buildRegistryPayload(reg, undefined, { codeOnlyFromBuiltins: true })
    ) as Record<string, { def: Record<string, unknown> }>;
    const def = payload['de-fora']?.def;
    expect(def?.name).toBe('De fora');
    expect(def?.runtime).toBeUndefined();
    expect((def?.transitions as Array<Record<string, unknown>>)[0]).toEqual({
      id: 'voo',
      name: 'Voo',
    });
    // os pacotes do editor continuam com o código
    const builtinWithRuntime = Object.entries(payload).find(
      ([id, entry]) => reg.isBuiltin(id) && entry.def.runtime
    );
    expect(builtinWithRuntime).toBeDefined();
  });

  it('a apresentação (moldura isolada) recebe o código do pacote importado', () => {
    const payload = JSON.parse(buildRegistryPayload(registryWithImported())) as Record<
      string,
      { def: Record<string, unknown> }
    >;
    expect(payload['de-fora']?.def.runtime).toBeDefined();
  });

  it('as molduras da apresentação não têm a mesma origem do editor', () => {
    expect(DECK_FRAME_SANDBOX).toContain('allow-scripts');
    expect(DECK_FRAME_SANDBOX).not.toContain('allow-same-origin');
  });
});
