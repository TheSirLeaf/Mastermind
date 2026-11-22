import { TransitionTab } from '@components/Inspector/TransitionTab';
import {
  createDefaultDeck,
  slideTransition,
  slideTransitionSpec,
  withSlideTransition,
  withSlideTransitionSpec,
} from '@packages/core/deck';
import { buildRegistryPayload, collectPackageIds } from '@packages/core/export';
import { migrateMovedPackages } from '@packages/core/movedPackages';
import { PackageRegistry, registry } from '@packages/core/PackageRegistry';
import { PKG_HOST_SRC } from '@packages/core/pkgHost';
import type { PackageDef, Slide } from '@packages/core/types';
import { registerBuiltins, SlingshotPackage } from '@packages/index';
import { useDeckStore } from '@store/deckStore';
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { insertPackage } from '../../src/editor/insertPackage';
import { resizePackage } from '../../src/editor/resizePackage';

registerBuiltins(registry);

const SLIDE = '<section class="slide dark"><h2 class="title">Oi</h2></section>';

function specOf(html: string, id: string): Record<string, unknown> {
  const el = new DOMParser().parseFromString(html, 'text/html').querySelector(`[data-pkg="${id}"]`);
  return JSON.parse(el?.getAttribute('data-spec') ?? '{}') as Record<string, unknown>;
}

describe('transição com campos próprios', () => {
  it('guarda os campos no slide e os descarta ao trocar de transição', () => {
    let html = withSlideTransition(SLIDE, 'pkg:slingshot:estilingue');
    html = withSlideTransitionSpec(html, { leftLabel: 'Testes' });
    expect(slideTransition(html)).toBe('pkg:slingshot:estilingue');
    expect(slideTransitionSpec(html)).toEqual({ leftLabel: 'Testes' });

    // a mesma transição mantém os campos; outra os descarta
    expect(slideTransitionSpec(withSlideTransition(html, 'pkg:slingshot:estilingue'))).toEqual({
      leftLabel: 'Testes',
    });
    expect(slideTransitionSpec(withSlideTransition(html, 'zoom'))).toEqual({});
  });

  it('a apresentação leva o pacote da transição mesmo sem elemento dele', () => {
    const deck = {
      title: 'x',
      slides: [{ id: 'a', html: withSlideTransition(SLIDE, 'pkg:slingshot:estilingue') }],
    };
    expect(collectPackageIds(deck)).toEqual(['slingshot']);
  });
});

describe('estilingue 2.0: de elemento a transição', () => {
  it('fica fora da lista de inserir e oferece a transição com cena', () => {
    expect(SlingshotPackage.version).toBe('2.0.0');
    expect(registry.listInsertable().map((def) => def.id)).not.toContain('slingshot');
    const found = registry.getTransition('pkg:slingshot:estilingue');
    expect(found?.transition.form?.length).toBeGreaterThan(0);
    expect(typeof found?.transition.scene).toBe('function');
    // a cena vai serializada para o HTML exportado
    expect(buildRegistryPayload(registry, ['slingshot'])).toContain('"scene":{"$fn"');
  });

  it('elementos antigos viram a transição do slide, com o mesmo texto', () => {
    const reg = new PackageRegistry();
    reg.register(SlingshotPackage);
    const legacy = SLIDE.replace(
      '</section>',
      `<div class="pk-wrap" data-pkg="slingshot" data-spec='{"leftLabel":"137 testes"}'><div class="pk-shot"></div></div></section>`
    );
    const untouched: Slide = { id: 'b', html: SLIDE };
    const out = migrateMovedPackages([{ id: 'a', html: legacy }, untouched], reg);
    expect(out[0]?.html).not.toContain('data-pkg');
    expect(slideTransition(out[0]?.html ?? '')).toBe('pkg:slingshot:estilingue');
    expect(slideTransitionSpec(out[0]?.html ?? '')).toEqual({ leftLabel: '137 testes' });
    expect(out[1]).toBe(untouched);
  });
});

describe('cena de transição na apresentação', () => {
  it('roda quando o slide entra, com os campos do slide sobre os padrões', () => {
    const reg = new PackageRegistry();
    const def: PackageDef = {
      id: 'cena',
      name: 'Cena',
      version: '1.0.0',
      icon: 'play',
      defaults: {},
      form: [],
      render: () => createElement('div'),
      transitions: [
        {
          id: 'pinta',
          name: 'Pinta',
          defaults: { cor: 'azul', forma: 'quadrado' },
          scene: (slide, spec) => {
            slide.setAttribute('data-cena', `${String(spec.cor)}-${String(spec.forma)}`);
            return { play: () => slide.setAttribute('data-tocou', '1'), final: () => undefined };
          },
        },
      ],
    };
    reg.register(def);
    document.body.innerHTML =
      `<script id="pkg-registry" type="application/json">${buildRegistryPayload(reg)}</script>` +
      `<section class="slide active" data-transition="pkg:cena:pinta" data-transition-spec='{"cor":"rosa"}'></section>`;
    (window as unknown as { __MM_HOST__?: boolean | undefined }).__MM_HOST__ = undefined;
    new Function(PKG_HOST_SRC)();
    const slide = document.querySelector('section') as HTMLElement;
    (window as unknown as { __anim: (s: HTMLElement) => void }).__anim(slide);
    expect(slide.getAttribute('data-cena')).toBe('rosa-quadrado');
    expect(slide.getAttribute('data-tocou')).toBe('1');
  });
});

describe('redimensionar pacotes com o mouse', () => {
  beforeEach(() => {
    useDeckStore.getState().setDeck(createDefaultDeck());
    useDeckStore.setState({ currentIndex: 0 });
  });

  const html = () => useDeckStore.getState().deck.slides[0]?.html ?? '';

  it('caixa de código: lateral muda a largura; canto muda largura e fonte juntos', () => {
    const inserted = insertPackage('code');
    const path = inserted?.path ?? [];
    resizePackage(path, { edge: 'e', from: { w: 900, h: 300 }, to: { w: 1200, h: 300 } });
    expect(specOf(html(), 'code')).toMatchObject({ w: 1200, fontSize: 24 });
    expect(html()).toContain('width: 1200px');

    resizePackage(path, { edge: 'se', from: { w: 1200, h: 300 }, to: { w: 600, h: 150 } });
    expect(specOf(html(), 'code')).toMatchObject({ w: 600, fontSize: 12 });
  });

  it('QR code: qualquer alça muda o lado (continua quadrado)', () => {
    const inserted = insertPackage('qr');
    resizePackage(inserted?.path ?? [], {
      edge: 's',
      from: { w: 360, h: 360 },
      to: { w: 360, h: 540 },
    });
    expect(specOf(html(), 'qr')).toMatchObject({ size: 540 });
    expect(html()).toContain('width: 540px');
  });

  it('gráfico: a largura acompanha e desfazer volta ao tamanho anterior', () => {
    const inserted = insertPackage('chart');
    resizePackage(inserted?.path ?? [], {
      edge: 's',
      from: { w: 900, h: 400 },
      to: { w: 900, h: 200 },
    });
    expect(specOf(html(), 'chart')).toMatchObject({ w: 450 });
    useDeckStore.getState().undo();
    expect(specOf(html(), 'chart')).toMatchObject({ w: 900 });
  });
});

describe('aba Transição', () => {
  beforeEach(() => {
    useDeckStore.getState().setDeck(createDefaultDeck());
    useDeckStore.setState({ currentIndex: 1 });
  });

  it('escolhe a transição de pacote e mostra os campos dela', () => {
    render(<TransitionTab />);
    fireEvent.click(screen.getByRole('button', { name: /Estilingue/ }));
    const slideHtml = useDeckStore.getState().deck.slides[1]?.html ?? '';
    expect(slideTransition(slideHtml)).toBe('pkg:slingshot:estilingue');
    expect(screen.getByText(/Ajustes · Estilingue/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Zoom' }));
    expect(slideTransition(useDeckStore.getState().deck.slides[1]?.html ?? '')).toBe('zoom');
  });
});
