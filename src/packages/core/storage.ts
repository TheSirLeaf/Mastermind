import { mediaRefs, SlideMediaCache, type PooledMedia } from './media';
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

/* -------------------------------------------------------------------------- */
/* Mídias separadas                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Rascunho e Recentes guardam as mídias embutidas uma vez só, em chaves `media:<nome>`; o HTML
 * guardado leva só a referência. Antes, cada apresentação em Recentes repetia os mesmos vídeos
 * e imagens em base64, e o espaço do navegador acabava rápido.
 */
const MEDIA_KEY = 'media:';
const storageMedia = new SlideMediaCache();
/** Mídias que já estão no IndexedDB (evita regravar a cada salvamento). */
const storedMedia = new Set<string>();

/** Grava o valor e, na mesma transação, as mídias que ele referencia e ainda não estão lá. */
function writeWithMedia(key: string, value: unknown, refs: Set<string>): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const added: string[] = [];
        for (const name of refs) {
          if (storedMedia.has(name)) continue;
          const media = storageMedia.pool.get(name);
          if (!media) continue;
          store.put(media, MEDIA_KEY + name);
          added.push(name);
        }
        store.put(value, key);
        tx.oncomplete = () => {
          added.forEach((name) => storedMedia.add(name));
          resolve();
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('Gravação cancelada (falta de espaço?).'));
      })
  );
}

const deckRefs = (deck: Deck): Set<string> =>
  mediaRefs([...deck.slides, ...(deck.bases ?? [])].map((slide) => slide.html).join('\n'));

/** Lê do IndexedDB as mídias que faltam no pool. */
async function loadMedia(refs: Set<string>): Promise<void> {
  const missing = [...refs].filter((name) => !storageMedia.pool.get(name));
  const found = await Promise.all(
    missing.map((name) => read<PooledMedia>(MEDIA_KEY + name).catch(() => undefined))
  );
  missing.forEach((name, i) => {
    const media = found[i];
    if (media && typeof media.base64 === 'string' && typeof media.mime === 'string') {
      storageMedia.pool.set(name, media);
      storedMedia.add(name);
    }
  });
}

/** Apaga as mídias que nem o rascunho nem as Recentes usam mais (uma transação só). */
export function collectUnusedMedia(): Promise<number> {
  return openDb().then(
    (db) =>
      new Promise<number>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const deckReq = store.get(DECK_KEY);
        const recentReq = store.get(RECENT_KEY);
        const keysReq = store.getAllKeys();
        let removed = 0;
        keysReq.onsuccess = () => {
          const used = mediaRefs(
            JSON.stringify([deckReq.result ?? null, recentReq.result ?? null])
          );
          for (const key of keysReq.result) {
            if (typeof key !== 'string' || !key.startsWith(MEDIA_KEY)) continue;
            const name = key.slice(MEDIA_KEY.length);
            if (used.has(name)) continue;
            store.delete(key);
            storedMedia.delete(name);
            removed += 1;
          }
        };
        tx.oncomplete = () => resolve(removed);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export async function loadSavedDeck(): Promise<Deck | undefined> {
  const deck = await read<Deck>(DECK_KEY);
  if (!deck?.slides) return deck;
  await loadMedia(deckRefs(deck));
  return storageMedia.unpackDeck(deck);
}

export function saveDeck(deck: Deck): Promise<void> {
  const packed = storageMedia.packDeck(deck);
  return writeWithMedia(DECK_KEY, packed, deckRefs(packed));
}

export async function loadRecentDecks(): Promise<RecentDeck[]> {
  const list = await read<RecentDeck[]>(RECENT_KEY);
  if (!Array.isArray(list)) return [];
  const valid = list.filter((item) => item?.deck?.slides?.length);
  const refs = new Set<string>();
  valid.forEach((item) => deckRefs(item.deck).forEach((name) => refs.add(name)));
  await loadMedia(refs);
  return valid.map((item) => ({ ...item, deck: storageMedia.unpackDeck(item.deck) }));
}

export async function saveRecentDecks(list: RecentDeck[]): Promise<void> {
  const packed = list.map((item) => ({ ...item, deck: storageMedia.packDeck(item.deck) }));
  const refs = new Set<string>();
  packed.forEach((item) => deckRefs(item.deck).forEach((name) => refs.add(name)));
  await writeWithMedia(RECENT_KEY, packed, refs);
  await collectUnusedMedia().catch(() => 0);
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
