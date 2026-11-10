import { describe, expect, it } from 'vitest';

import {
  buildEditorHTML,
  buildPresentationHTML,
  buildRegistryPayload,
  setCachedTemplate,
} from '../../src/packages/core/export';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import type { Deck, PackageDef } from '../../src/packages/core/types';

const template = `<!doctype html><html><head><title>{{TITLE}}</title><style id="pkg-css">{{PKG_CSS}}</style></head>
<body><div id="deck">{{SLIDES}}</div>
<script type="application/json" id="pkg-registry">{{PKG_REGISTRY}}</script>
<script id="pkg-host">{{PKG_HOST}}</script>
<script>{{NAV}}</script></body></html>`;

const deck: Deck = {
  title: 'Teste <A3>',
  slides: [
    { id: 'a', html: '<section class="slide dark">A</section>' },
    { id: 'b', html: '<section class="slide light">B</section>' },
  ],
};

const pkg: PackageDef = {
  id: 'demo',
  name: 'Demo',
  version: '1.0.0',
  icon: 'box',
  defaults: { text: 'x' },
  form: [{ group: 'G', fields: [] }],
  css: '.pk-demo{color:red}',
  render: () => null,
};

describe('export', () => {
  it('preenche todos os placeholders do template', () => {
    const registry = new PackageRegistry();
    registry.register(pkg);
    const html = buildPresentationHTML({ template, deck, registry });

    expect(html).not.toContain('{{');
    expect(html).toContain('Teste &lt;A3&gt;');
    expect(html).toContain('class="slide dark"');
    expect(html).toContain('.pk-demo{color:red}');
    expect(html).toContain('__MM_HOST__');
    expect(html).toContain("querySelectorAll('.slide')");
  });

  it('preserva $& no HTML', () => {
    const registry = new PackageRegistry();
    registry.register(pkg);
    const html = buildPresentationHTML({
      template,
      deck: { ...deck, slides: [{ id: 'x', html: '<p>$& $1</p>' }] },
      registry,
    });
    expect(html).toContain('<p>$& $1</p>');
  });

  it('monta o payload do registry por id', () => {
    const registry = new PackageRegistry();
    registry.register(pkg);
    const payload = JSON.parse(buildRegistryPayload(registry));
    expect(payload.demo.def.id).toBe('demo');
    expect(payload.demo.def.render.$fn).toBeTruthy();
  });

  it('o documento do editor não inclui o host nem a navegação', () => {
    setCachedTemplate(template);
    const registry = new PackageRegistry();
    registry.register(pkg);
    const html = buildEditorHTML(deck, registry);
    expect(html).not.toContain('__MM_HOST__');
    expect(html).toContain('__MM_EDITOR__');
  });
});
