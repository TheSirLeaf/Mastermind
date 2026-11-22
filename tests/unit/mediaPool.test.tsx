import { createDefaultDeck } from '@packages/core/deck';
import { mediaRefs, MediaPool, SlideMediaCache } from '@packages/core/media';
import { buildDeckFile } from '@packages/core/mmdeck';
import { PackageRegistry, registry } from '@packages/core/PackageRegistry';
import type { PackageDef } from '@packages/core/types';
import { registerBuiltins } from '@packages/index';
import { useDeckStore } from '@store/deckStore';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { openDeckFile } from '../../src/editor/actions';

registerBuiltins(registry);

const VIDEO = `data:video/mp4;base64,${'AAAAIGZ0eXBpc29t'.repeat(400)}`;
const ICON = 'data:image/png;base64,iVBORw0KGgo=';

describe('MediaPool', () => {
  it('troca mídias grandes por referência, uma cópia por mídia, e volta ao HTML original', () => {
    const pool = new MediaPool();
    const html = `<video src="${VIDEO}"></video><div style="background:url(${VIDEO})"></div><img src="${ICON}">`;
    const packed = pool.pack(html);
    expect(packed).not.toContain('base64,AAAA');
    expect(packed).toContain(ICON); // ícone pequeno fica no HTML
    expect(pool.size).toBe(1);
    expect(mediaRefs(packed).size).toBe(1);
    expect(pool.unpack(packed)).toBe(html);
  });

  it('mídias diferentes com o mesmo hash não se misturam', () => {
    const pool = new MediaPool();
    const a = 'A'.repeat(20_000);
    // muda só um trecho fora das amostras do hash
    const b = `${'A'.repeat(5_000)}B${'A'.repeat(14_999)}`;
    const na = pool.add('video/mp4', a);
    const nb = pool.add('video/mp4', b);
    expect(na).not.toBe(nb);
    expect(pool.get(nb)?.base64).toBe(b);
    expect(pool.add('video/mp4', a)).toBe(na);
  });

  it('o cache por slide reaproveita o que não mudou e devolve o mesmo objeto', () => {
    const cache = new SlideMediaCache();
    const deck = createDefaultDeck();
    const withVideo = {
      ...deck,
      slides: [
        { id: 'v', html: `<section class="slide"><video src="${VIDEO}"></video></section>` },
      ],
    };
    const packed = cache.packDeck(withVideo);
    expect(cache.packDeck(withVideo)).toEqual(packed);
    expect(packed.slides[0]?.html.length).toBeLessThan(200);
    expect(cache.unpackDeck(packed).slides[0]).toBe(withVideo.slides[0]);
  });
});

describe('histórico com mídia', () => {
  it('desfazer e refazer restauram o vídeo; o histórico guarda só referências', () => {
    const store = useDeckStore.getState();
    store.setDeck({
      title: 't',
      slides: [
        { id: 'a', html: `<section class="slide"><video src="${VIDEO}"></video></section>` },
      ],
    });
    const original = useDeckStore.getState().deck.slides[0]?.html ?? '';
    useDeckStore.getState().updateSlideHTML(0, original.replace('<video', '<video muted'));
    useDeckStore.getState().updateSlideHTML(0, original.replace('<video', '<video loop'));
    useDeckStore.getState().undo();
    expect(useDeckStore.getState().deck.slides[0]?.html).toContain('muted');
    expect(useDeckStore.getState().deck.slides[0]?.html).toContain(VIDEO);
    useDeckStore.getState().undo();
    expect(useDeckStore.getState().deck.slides[0]?.html).toBe(original);
    useDeckStore.getState().redo();
    useDeckStore.getState().redo();
    expect(useDeckStore.getState().deck.slides[0]?.html).toContain('loop');
    expect(useDeckStore.getState().deck.slides[0]?.html).toContain(VIDEO);
  });
});

describe('salvamento automático', () => {
  it('a falha fica marcada até o próximo salvamento bem-sucedido', () => {
    useDeckStore.getState().markSaveFailed();
    expect(useDeckStore.getState().saveError).toBe(true);
    useDeckStore.getState().markSaved();
    expect(useDeckStore.getState().saveError).toBe(false);
  });
});

describe('.mmdeck com pacotes', () => {
  const custom: PackageDef = {
    id: 'pacote-de-fora',
    name: 'Pacote de fora',
    version: '1.0.0',
    author: 'Alguém',
    icon: 'box',
    defaults: {},
    form: [],
    render: () => createElement('p', null, 'oi'),
  };

  afterEach(() => {
    vi.restoreAllMocks();
    registry.unregister('pacote-de-fora');
  });

  function fileWithCustomPackage(): File {
    const reg = new PackageRegistry();
    registerBuiltins(reg);
    reg.register(custom, { replace: true });
    const deck = createDefaultDeck();
    deck.slides[0] = {
      id: 'x',
      html: '<section class="slide"><div data-pkg="pacote-de-fora" data-spec="{}"></div></section>',
    };
    const bytes = buildDeckFile(deck, reg) as Uint8Array<ArrayBuffer>;
    return new File([bytes], 'de-fora.mmdeck');
  }

  it('pergunta antes de instalar; recusando, abre a apresentação sem o pacote', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(await openDeckFile(fileWithCustomPackage())).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0]?.[0]).toContain('Pacote de fora 1.0.0 — Alguém');
    expect(registry.has('pacote-de-fora')).toBe(false);
    expect(useDeckStore.getState().deck.slides[0]?.html).toContain('pacote-de-fora');
  });

  it('aceitando, instala o pacote', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(await openDeckFile(fileWithCustomPackage())).toBe(true);
    expect(registry.get('pacote-de-fora')?.version).toBe('1.0.0');
  });
});
