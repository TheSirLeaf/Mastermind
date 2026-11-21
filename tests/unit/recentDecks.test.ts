import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultDeck } from '../../src/packages/core/deck';
import type * as Storage from '../../src/packages/core/storage';
import type { RecentDeck } from '../../src/packages/core/storage';
import type { Deck } from '../../src/packages/core/types';

// O jsdom não tem IndexedDB: Recentes ficam numa lista em memória.
let stored: RecentDeck[] = [];
vi.mock('../../src/packages/core/storage', async (importOriginal) => {
  const real = await importOriginal<typeof Storage>();
  return {
    ...real,
    loadRecentDecks: vi.fn(() => Promise.resolve(stored)),
    saveRecentDecks: vi.fn((list: RecentDeck[]) => {
      stored = list;
      return Promise.resolve();
    }),
  };
});

const { withRecent, MAX_RECENT_DECKS } = await import('../../src/packages/core/storage');
const { isPristineDeck, newDeck, replaceDeck, restoreRecentDeck } =
  await import('../../src/editor/actions');
const { useDeckStore } = await import('../../src/store/deckStore');

const named = (title: string, text = title): Deck => ({
  title,
  slides: [{ id: `s-${title}`, html: `<section class="slide dark"><h1>${text}</h1></section>` }],
});

beforeEach(() => {
  stored = [];
  useDeckStore.getState().setDeck(createDefaultDeck());
});

describe('Recentes', () => {
  it('põe a apresentação no topo, sem duplicar e com limite', () => {
    let list: RecentDeck[] = [];
    list = withRecent(list, named('A'), 1);
    list = withRecent(list, named('B'), 2);
    // a mesma A de novo (ids diferentes não importam): sobe para o topo, não duplica
    list = withRecent(list, { ...named('A'), slides: [{ ...named('A').slides[0]!, id: 'x' }] }, 3);
    expect(list.map((item) => item.title)).toEqual(['A', 'B']);
    expect(list[0]).toMatchObject({ slides: 1, at: 3 });

    for (let i = 0; i < 20; i += 1) list = withRecent(list, named(`D${i}`), 10 + i);
    expect(list).toHaveLength(MAX_RECENT_DECKS);
    expect(list[0]?.title).toBe('D19');
  });

  it('reconhece a apresentação nova ainda sem mexer', () => {
    expect(isPristineDeck(createDefaultDeck())).toBe(true);
    expect(isPristineDeck({ ...createDefaultDeck(), title: 'Minha' })).toBe(false);
    expect(isPristineDeck(named('Outra'))).toBe(false);
  });

  it('trocar de apresentação guarda a anterior em Recentes (e a vazia não)', async () => {
    await newDeck();
    expect(stored).toHaveLength(0);

    useDeckStore.getState().setTitle('Trabalho importante');
    await replaceDeck(named('Outra'));
    expect(useDeckStore.getState().deck.title).toBe('Outra');
    expect(stored.map((item) => item.title)).toEqual(['Trabalho importante']);
  });

  it('reabrir de Recentes troca de lugar com a atual', async () => {
    useDeckStore.getState().setDeck(named('Primeira'));
    await replaceDeck(named('Segunda'));
    const id = stored[0]?.id ?? '';

    expect(await restoreRecentDeck(id)).toBe(true);
    expect(useDeckStore.getState().deck.title).toBe('Primeira');
    expect(stored.map((item) => item.title)).toEqual(['Segunda']);
    expect(await restoreRecentDeck('nao-existe')).toBe(false);
  });
});
