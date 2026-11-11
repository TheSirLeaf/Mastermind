import { describe, expect, it, vi } from 'vitest';

import { CodePackage } from '../../src/packages/code/CodePackage';
import {
  buildEditorHTML,
  buildPresentationHTML,
  buildRegistryPayload,
  collectPackageIds,
  packageElementHTML,
  setCachedTemplate,
  slugifyTitle,
} from '../../src/packages/core/export';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import { PKG_HOST_SRC } from '../../src/packages/core/pkgHost';
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
  it('preserva specs com quebras de linha e aspas no data-spec', () => {
    const spec = {
      code: 'linha "um"\nlinha <dois> & três',
      title: 'demo',
    };
    const html = packageElementHTML('code', spec, '<div>inner</div>');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const wrapper = doc.querySelector('[data-pkg="code"]');
    const raw = wrapper?.getAttribute('data-spec');

    expect(wrapper).not.toBeNull();
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}')).toEqual(spec);
  });

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

  it('coleta os pacotes usados nos slides', () => {
    expect(
      collectPackageIds({
        ...deck,
        slides: [
          { id: 'a', html: '<div data-pkg="code" data-spec="{}"></div>' },
          { id: 'b', html: '<div data-pkg="chart"></div><div data-pkg="code"></div>' },
        ],
      })
    ).toEqual(['code', 'chart']);
  });

  it('inclui CSS de impressão e apenas os pacotes usados', () => {
    const registry = new PackageRegistry();
    registry.register(pkg);
    registry.register({ ...pkg, id: 'unused', name: 'Unused' });
    const html = buildPresentationHTML({
      template,
      deck: { ...deck, slides: [{ id: 'a', html: '<div data-pkg="demo"></div>' }] },
      registry,
    });
    const payload = JSON.parse(html.match(/id="pkg-registry">(.*?)<\/script>/s)?.[1] ?? '{}');
    expect(Object.keys(payload)).toEqual(['demo']);
    expect(html).toContain('id="mm-print"');
    expect(html).toContain('@page');
  });

  it('gera slug de arquivo sem acentos', () => {
    expect(slugifyTitle('Apresentação A3 · GQS')).toBe('apresentacao-a3-gqs');
    expect(slugifyTitle('!!!')).toBe('apresentacao');
  });

  it('o documento do editor não inclui o host nem a navegação', () => {
    setCachedTemplate(template);
    const registry = new PackageRegistry();
    registry.register(pkg);
    const html = buildEditorHTML(deck, registry);
    expect(html).not.toContain('__MM_HOST__');
    expect(html).toContain('__MM_EDITOR__');
  });

  it('end-to-end: o host revive o runtime do code e digita no HTML standalone', async () => {
    const registry = new PackageRegistry();
    registry.register(CodePackage);
    const spec = {
      ...CodePackage.defaults,
      typing: true,
      delay: 0,
      cps: 1, // lento: permite observar o meio da digitação
      caret: false,
      lineGlow: false,
    };
    const inner =
      '<pre class="pk-pre"><span class="pk-ln">linha um</span><span class="pk-ln">linha dois</span></pre>';
    const codeDeck: Deck = {
      title: 'Standalone',
      slides: [
        {
          id: 'code',
          html: `<section class="slide dark">${packageElementHTML('code', spec, inner)}</section>`,
        },
      ],
    };

    const exported = buildPresentationHTML({ template, deck: codeDeck, registry });
    expect(exported).toContain('"$fn"');
    expect(exported).toContain('__MM_HOST__');

    // Monta o documento exportado no jsdom e executa o host real (o mesmo
    // script embutido que roda ao abrir o arquivo standalone).
    const doc = new DOMParser().parseFromString(exported, 'text/html');
    document.head.innerHTML = doc.head.innerHTML;
    document.body.innerHTML = doc.body.innerHTML;
    const w = window as unknown as Record<string, unknown>;
    delete w.__MM_HOST__;
    delete w.__anim;
    (0, eval)(PKG_HOST_SRC);

    const animate = w.__anim as (slide: Element) => void;
    expect(animate).toBeTypeOf('function');
    const slide = document.querySelector('section.slide');
    expect(slide).not.toBeNull();
    animate(slide!);

    await vi.waitFor(
      () => {
        const firstLine = document.querySelector('span.pk-ln');
        expect(firstLine?.textContent ?? '', 'a digitação deveria ter começado').not.toBe(
          'linha um'
        );
      },
      { timeout: 3000 }
    );

    // Encerra a animação (para os timers do host) e devolve o documento limpo.
    animate(document.createElement('section'));
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete w.__MM_HOST__;
    delete w.__anim;
  });
});
