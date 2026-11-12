import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { H } from '../../src/packages/core/helper';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';

describe('pacote de exemplo da documentação', () => {
  it('importa, renderiza e expõe a transição', () => {
    const registry = new PackageRegistry();
    const text = readFileSync('docs/examples/callout.dialcron-pkg.json', 'utf-8');
    const result = registry.import(text);
    expect(result.skipped).toEqual([]);
    expect(result.imported.map((p) => p.id)).toEqual(['callout']);

    const def = registry.get('callout');
    expect(def).toBeDefined();
    const html = String(def?.render({ title: 'A<b>', text: 'x', tone: 'red' } as never, H));
    expect(html).toContain('A&lt;b&gt;');
    expect(registry.listTransitions()[0]?.value).toBe('pkg:callout:fade-up');
    expect(registry.css()).toContain('.slide.t-in-pk-callout-fade-up');
  });
});
