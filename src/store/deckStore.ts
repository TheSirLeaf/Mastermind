import { produce } from 'immer';
import { create } from 'zustand';

import { applyElementPatch, type ElementPatch } from '../packages/core/animation';
import {
  createDefaultDeck,
  makeSlide,
  renumberFooters,
  slideNotes,
  slideTitle,
  DEFAULT_TEXT_HTML,
} from '../packages/core/deck';
import { HistoryManager } from '../packages/core/history';
import type { Deck, SelectionInfo, Slide } from '../packages/core/types';

export interface DeckState {
  deck: Deck;
  currentIndex: number;
  selection: SelectionInfo | null;
  /** Seleção a aplicar no iframe depois de inserir um elemento. */
  pendingSelection: number[] | null;
  /** Incrementa a cada restauração de histórico (força re-render). */
  revision: number;
  dirty: boolean;
  savedAt: number | null;
  canUndo: boolean;
  canRedo: boolean;

  setDeck: (deck: Deck) => void;
  addSlide: (html?: string, at?: number) => void;
  deleteSlide: (index: number) => void;
  duplicateSlide: (index: number) => void;
  moveSlide: (from: number, to: number) => void;
  updateSlideHTML: (index: number, html: string, coalesceKey?: string) => void;
  /** Atualiza o innerHTML de um elemento a partir do path do iframe. */
  updateElementHTML: (path: number[], innerHTML: string) => void;
  /** Aplica atributos/estilos/classes em um elemento sem recarregar o iframe. */
  patchElement: (path: number[], patch: ElementPatch) => void;
  updateSlideNotes: (index: number, notes: string) => void;
  setTitle: (title: string) => void;
  selectSlide: (index: number) => void;
  setSelection: (selection: SelectionInfo | null) => void;
  requestSelection: (path: number[] | null) => void;
  undo: () => void;
  redo: () => void;
  markSaved: (at?: number) => void;
}

interface Snapshot {
  deck: Deck;
  currentIndex: number;
}

const cloneDeck = (deck: Deck): Deck => JSON.parse(JSON.stringify(deck)) as Deck;

const history = new HistoryManager<Snapshot>((snapshot) => ({
  deck: cloneDeck(snapshot.deck),
  currentIndex: snapshot.currentIndex,
}));

export const getSlideTitle = (slide: Slide): string => slideTitle(slide.html);

export const getSlideNotes = (slide: Slide): string => slideNotes(slide.html);

function normalizeDeck(deck: Deck): Deck {
  return { ...deck, slides: renumberFooters(deck.slides) };
}

export const useDeckStore = create<DeckState>()((set, get) => {
  const snapshot = (): Snapshot => ({
    deck: get().deck,
    currentIndex: get().currentIndex,
  });

  const apply = (updater: (draft: Deck) => void, coalesceKey?: string): void => {
    history.push(snapshot(), coalesceKey);
    set(
      produce<DeckState>((draft) => {
        updater(draft.deck);
        draft.revision += 1;
        draft.dirty = true;
        draft.canUndo = history.canUndo;
        draft.canRedo = history.canRedo;
      })
    );
  };

  return {
    deck: createDefaultDeck(),
    currentIndex: 0,
    selection: null,
    pendingSelection: null,
    revision: 0,
    dirty: false,
    savedAt: null,
    canUndo: false,
    canRedo: false,

    setDeck: (deck) => {
      history.reset();
      set({
        deck: normalizeDeck(deck),
        currentIndex: 0,
        selection: null,
        revision: 1,
        dirty: false,
        canUndo: false,
        canRedo: false,
      });
    },

    addSlide: (html = DEFAULT_TEXT_HTML, at) => {
      apply((deck) => {
        const index = at ?? deck.slides.length;
        deck.slides.splice(index, 0, makeSlide(html));
      });
      const index = at ?? Math.max(0, get().deck.slides.length - 1);
      set({ currentIndex: Math.min(index, get().deck.slides.length - 1), selection: null });
    },

    deleteSlide: (index) => {
      if (get().deck.slides.length <= 1) return;
      apply((deck) => {
        deck.slides.splice(index, 1);
        deck.slides = renumberFooters(deck.slides);
      });
      const nextIndex = Math.max(0, Math.min(get().currentIndex, get().deck.slides.length - 1));
      set({ currentIndex: nextIndex, selection: null });
    },

    duplicateSlide: (index) => {
      const source = get().deck.slides[index];
      if (!source) return;
      apply((deck) => {
        deck.slides.splice(index + 1, 0, makeSlide(source.html));
      });
      set({ currentIndex: index + 1, selection: null });
    },

    moveSlide: (from, to) => {
      const slides = get().deck.slides;
      if (from === to || from < 0 || from >= slides.length || to < 0 || to >= slides.length) {
        return;
      }
      apply((deck) => {
        const [moved] = deck.slides.splice(from, 1);
        if (moved) deck.slides.splice(to, 0, moved);
      });
      set({ currentIndex: to, selection: null });
    },

    updateSlideHTML: (index, html, coalesceKey) => {
      apply((deck) => {
        const slide = deck.slides[index];
        if (slide) slide.html = html;
      }, coalesceKey);
    },

    updateElementHTML: (path, innerHTML) => {
      const [slideIndex, ...rest] = path;
      if (slideIndex === undefined || rest.length === 0) return;
      const slide = get().deck.slides[slideIndex];
      if (!slide) return;

      const doc = new DOMParser().parseFromString(slide.html, 'text/html');
      // O primeiro item do path é o índice do slide; os demais são filhos da section.
      let node: Element | null = doc.body.firstElementChild;
      for (const part of rest) {
        node = node?.children[part] ?? null;
        if (!node) return;
      }
      if (!node) return;
      node.innerHTML = innerHTML;
      const html = doc.body.firstElementChild?.outerHTML ?? slide.html;
      get().updateSlideHTML(slideIndex, html, `element:${path.join('.')}`);
    },

    patchElement: (path, patch) => {
      const [slideIndex, ...rest] = path;
      if (slideIndex === undefined || rest.length === 0) return;
      const slide = get().deck.slides[slideIndex];
      if (!slide) return;

      const doc = new DOMParser().parseFromString(slide.html, 'text/html');
      let node: Element | null = doc.body.firstElementChild;
      for (const part of rest) {
        node = node?.children[part] ?? null;
        if (!node) return;
      }
      if (!node) return;
      applyElementPatch(node, patch);
      const html = doc.body.firstElementChild?.outerHTML ?? slide.html;
      get().updateSlideHTML(slideIndex, html, `element:${path.join('.')}`);
    },

    updateSlideNotes: (index, notes) => {
      apply((deck) => {
        const slide = deck.slides[index];
        if (!slide) return;
        slide.html = slide.html.replace(
          /data-notes="[^"]*"/,
          `data-notes="${notes.replace(/"/g, '&quot;')}"`
        );
      }, `notes:${index}`);
    },

    setTitle: (title) => {
      apply((deck) => {
        deck.title = title;
      }, 'title');
    },

    selectSlide: (index) => {
      const count = get().deck.slides.length;
      if (index < 0 || index >= count) return;
      set({ currentIndex: index, selection: null });
    },

    setSelection: (selection) => set({ selection }),

    requestSelection: (path) => set({ pendingSelection: path }),

    undo: () => {
      const previous = history.undo(snapshot());
      if (!previous) return;
      set({
        deck: previous.deck,
        currentIndex: Math.min(previous.currentIndex, previous.deck.slides.length - 1),
        selection: null,
        revision: get().revision + 1,
        dirty: true,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
      });
    },

    redo: () => {
      const next = history.redo(snapshot());
      if (!next) return;
      set({
        deck: next.deck,
        currentIndex: Math.min(next.currentIndex, next.deck.slides.length - 1),
        selection: null,
        revision: get().revision + 1,
        dirty: true,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
      });
    },

    markSaved: (at = Date.now()) => set({ dirty: false, savedAt: at }),
  };
});
