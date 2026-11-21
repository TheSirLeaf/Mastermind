import type { Deck, SerializedPackage } from './types';

const DB_NAME = 'mastermind-editor';
const DB_VERSION = 1;
const STORE = 'kv';
const DECK_KEY = 'deck';
const PACKAGES_KEY = 'packages';
const RECENT_KEY = 'recent';

/** Quantas apresentações substituídas ficam guardadas em Recentes. */
export const MAX_RECENT_DECKS = 8;

/** Apresentação guardada em Recentes (ao abrir ou criar outra, a atual vai para cá). */
export interface RecentDeck {
  id: string;
  title: string;
  slides: number;
  /** Quando foi guardada (ms). */
  at: number;
  deck: Deck;
}

/** Conteúdo que define "a mesma apresentação" (ids dos slides mudam a cada abertura). */
function deckContent(deck: Deck): string {
  return JSON.stringify([
    deck.title,
    deck.slides.map((s) => s.html),
    (deck.bases ?? []).map((b) => b.html),
    deck.settings ?? null,
  ]);
}

/**
 * Lista de Recentes com `deck` no topo. Uma cópia igual que já esteja na lista sai de onde
 * estava (não duplica) e a lista fica com no máximo `max` itens.
 */
export function withRecent(
  list: RecentDeck[],
  deck: Deck,
  at: number = Date.now(),
  max: number = MAX_RECENT_DECKS
): RecentDeck[] {
  const content = deckContent(deck);
  const rest = list.filter((item) => deckContent(item.deck) !== content);
  const entry: RecentDeck = {
    id: `r-${at.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: deck.title || 'Apresentação sem título',
    slides: deck.slides.length,
    at,
    deck,
  };
  return [entry, ...rest].slice(0, Math.max(0, max));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir IndexedDB.'));
  });
  return dbPromise;
}

function read<T>(key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function write(key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

export function loadSavedDeck(): Promise<Deck | undefined> {
  return read<Deck>(DECK_KEY);
}

export function saveDeck(deck: Deck): Promise<void> {
  return write(DECK_KEY, deck);
}

export async function loadRecentDecks(): Promise<RecentDeck[]> {
  const list = await read<RecentDeck[]>(RECENT_KEY);
  return Array.isArray(list) ? list.filter((item) => item?.deck?.slides?.length) : [];
}

export function saveRecentDecks(list: RecentDeck[]): Promise<void> {
  return write(RECENT_KEY, list);
}

export function loadSavedPackages(): Promise<SerializedPackage[] | undefined> {
  return read<SerializedPackage[]>(PACKAGES_KEY);
}

export function savePackages(packages: SerializedPackage[]): Promise<void> {
  return write(PACKAGES_KEY, packages);
}

/** Cria uma função com debounce para salvamentos frequentes. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms = 600
): ((...args: A) => void) & { flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;

  const run = () => {
    timer = null;
    if (!pending) return;
    const args = pending;
    pending = null;
    fn(...args);
  };

  const wrapped = ((...args: A) => {
    pending = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, ms);
  }) as ((...args: A) => void) & { flush: () => void; cancel: () => void };

  wrapped.flush = () => {
    if (timer) clearTimeout(timer);
    run();
  };
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };
  return wrapped;
}
