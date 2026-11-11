import { beforeEach, describe, expect, it } from 'vitest';

import { buildRegistryPayload } from '../../src/packages/core/export';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import { PKG_HOST_SRC } from '../../src/packages/core/pkgHost';
import type { PackageDef } from '../../src/packages/core/types';

declare global {
  interface Window {
    __anim?: (slide: Element) => void;
    __MM_HOST__?: boolean;
    __testCalls?: string[];
  }
}

const demo: PackageDef = {
  id: 'demo',
  name: 'Demo',
  version: '1.0.0',
  icon: 'box',
  defaults: { value: 7 },
  form: [],
  render: () => null,
  runtime: (root, spec) => {
    window.__testCalls?.push(`mount:${String(spec.value)}`);
    return {
      play: () => {
        window.__testCalls?.push(`play:${root.getAttribute('data-pkg')}`);
      },
      final: () => {
        window.__testCalls?.push('final');
      },
    };
  },
};

function startHost(): void {
  new Function(PKG_HOST_SRC)();
}

beforeEach(() => {
  document.body.innerHTML = '';
  delete window.__MM_HOST__;
  delete window.__anim;
  window.__testCalls = [];
});

describe('PKG_HOST_SRC', () => {
  it('revive runtime serializado como { $fn } e executa play/final', () => {
    const registry = new PackageRegistry();
    registry.register(demo);
    const payload = buildRegistryPayload(registry);

    document.body.innerHTML = `
      <div id="deck">
        <section class="slide active"><div data-pkg="demo" data-spec='{"value":7}'></div></section>
      </div>
      <script type="application/json" id="pkg-registry">${payload}</script>`;

    startHost();
    const slide = document.querySelector('.slide.active');
    expect(slide).not.toBeNull();
    window.__anim?.(slide!);

    expect(window.__testCalls).toEqual(['mount:7', 'play:demo']);

    window.dispatchEvent(new Event('beforeprint'));
    expect(window.__testCalls).toEqual(['mount:7', 'play:demo', 'final']);
  });

  it('ignora pacotes sem runtime e não quebra a apresentação', () => {
    const registry = new PackageRegistry();
    const withoutRuntime: PackageDef = { ...demo, id: 'sem-runtime' };
    delete withoutRuntime.runtime;
    registry.register(withoutRuntime);
    const payload = buildRegistryPayload(registry);

    document.body.innerHTML = `
      <div id="deck">
        <section class="slide active"><div data-pkg="sem-runtime" data-spec="{}"></div></section>
        <section class="slide"><div data-pkg="inexistente" data-spec="{}"></div></section>
      </div>
      <script type="application/json" id="pkg-registry">${payload}</script>`;

    startHost();
    expect(() => window.__anim?.(document.querySelector('.slide.active')!)).not.toThrow();
    expect(window.__testCalls).toEqual([]);
  });
});
