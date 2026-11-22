import { createDefaultDeck } from '@packages/core/deck';
import {
  buildDeckFile,
  isNewerVersion,
  looksLikeDeckFile,
  MMDECK_VERSION,
  MmdeckError,
  packagesToInstall,
  readDeckFile,
} from '@packages/core/mmdeck';
import { PackageRegistry, registry } from '@packages/core/PackageRegistry';
import type { Deck, PackageDef } from '@packages/core/types';
import { registerBuiltins } from '@packages/index';
import { useDeckStore } from '@store/deckStore';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { openDeckFile } from '../../src/editor/actions';

registerBuiltins(registry);

const PNG = `data:image/png;base64,${'iVBORw0KGgo'.padEnd(2000, 'A')}`;

function deckWithImage(): Deck {
  const deck = createDefaultDeck();
  const img = `<img src="${PNG}" alt="foto">`;
  return {
    ...deck,
    title: 'Minha palestra',
    slides: deck.slides.map((slide, i) =>
      i < 2 ? { ...slide, html: slide.html.replace('</section>', `${img}</section>`) } : slide
    ),
  };
}

const custom: PackageDef = {
  id: 'meu-pacote',
  name: 'Meu pacote',
  version: '1.2.0',
  icon: 'box',
  defaults: { texto: 'oi' },
  form: [],
  render: (spec) => createElement('p', null, String(spec.texto)),
};

describe('formato .mmdeck', () => {
  it('ida e volta preserva a apresentação, com a mídia em arquivo separado e sem repetição', () => {
    const deck = deckWithImage();
    const bytes = buildDeckFile(deck, registry);
    expect(looksLikeDeckFile(bytes)).toBe(true);

    const files = unzipSync(bytes);
    expect(Object.keys(files)[0]).toBe('mimetype');
    const media = Object.keys(files).filter((name) => name.startsWith('media/'));
    expect(media).toHaveLength(1);
    expect(media[0]).toMatch(/\.png$/);
    expect(strFromU8(files['deck.json'] as Uint8Array)).not.toContain('data:image/png');

    const read = readDeckFile(bytes);
    expect(read.manifest.version).toBe(MMDECK_VERSION);
    expect(read.deck).toEqual(deck);
  });

  it('leva os pacotes importados usados, e só eles', () => {
    const reg = new PackageRegistry();
    registerBuiltins(reg);
    reg.register(custom, { replace: true });
    const deck = createDefaultDeck();
    deck.slides[0] = {
      id: 'x',
      html: '<section class="slide"><div data-pkg="meu-pacote" data-spec="{}"></div><div data-pkg="code" data-spec="{}"></div></section>',
    };
    const read = readDeckFile(buildDeckFile(deck, reg));
    expect(read.manifest.packages).toMatchObject({
      'meu-pacote': '1.2.0',
      code: expect.any(String),
    });
    expect(read.packages.map((p) => p.id)).toEqual(['meu-pacote']);

    // instala se faltar ou se o arquivo trouxer versão mais nova; nunca troca os incluídos
    const other = new PackageRegistry();
    registerBuiltins(other);
    expect(packagesToInstall(read.packages, other).map((p) => p.id)).toEqual(['meu-pacote']);
    other.register({ ...custom, version: '1.10.0' }, { replace: true });
    expect(packagesToInstall(read.packages, other)).toEqual([]);
    expect(
      packagesToInstall([{ ...read.packages[0]!, id: 'code', version: '99.0.0' }], other)
    ).toEqual([]);
  });

  it('recusa arquivos que não são .mmdeck, corrompidos ou de versão mais nova', () => {
    expect(() => readDeckFile(strToU8('<html></html>'))).toThrow(MmdeckError);
    expect(() => readDeckFile(zipSync({ 'deck.json': strToU8('{}') }))).toThrow(
      /não é uma apresentação/
    );
    const future = zipSync({
      'manifest.json': strToU8(
        JSON.stringify({ format: 'mastermind-deck', version: MMDECK_VERSION + 1 })
      ),
      'deck.json': strToU8('{"title":"x","slides":[]}'),
    });
    expect(() => readDeckFile(future)).toThrow(/versão mais nova/);
    const broken = zipSync({
      'manifest.json': strToU8(JSON.stringify({ format: 'mastermind-deck', version: 1 })),
      'deck.json': strToU8('{"slides":[{"id":1}]}'),
    });
    expect(() => readDeckFile(broken)).toThrow(/corrompido/);
  });

  it('compara versões de pacote', () => {
    expect(isNewerVersion('1.10.0', '1.9.0')).toBe(true);
    expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false);
    expect(isNewerVersion('2.0', '1.9.9')).toBe(true);
  });

  it('“Abrir…” reconhece o .mmdeck e carrega a apresentação', async () => {
    const deck = deckWithImage();
    const bytes = buildDeckFile(deck, registry);
    const file = new File([bytes as Uint8Array<ArrayBuffer>], 'minha-palestra.mmdeck');
    expect(await openDeckFile(file)).toBe(true);
    const opened = useDeckStore.getState().deck;
    expect(opened.title).toBe('Minha palestra');
    expect(opened.slides[0]?.html).toContain(PNG);
  });
});
