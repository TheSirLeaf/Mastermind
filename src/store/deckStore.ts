import '../editor/clipboard';
import { produce } from 'immer';
import { create } from 'zustand';

import { applyElementPatch, type ElementPatch } from '../packages/core/animation';
import {
  baseName,
  baseOwnId,
  makeBase,
  upgradeBase,
  newBaseId,
  slideBaseId,
  withBaseName,
  withSlideBaseId,
} from '../packages/core/bases';
import {
  createDefaultDeck,
  makeSlide,
  newSlideId,
  renumberFooters,
  slideNotes,
  slideTitle,
  DEFAULT_TEXT_HTML,
  slideTemplateHTML,
  withSlideBackground,
  withSlideClass,
  withSlideChat,
  withSlideLayout,
  withSlideTransition,
  type SlideLayout,
  type SlideTransition,
  type SlideTemplateKind,
} from '../packages/core/deck';
import { HistoryManager } from '../packages/core/history';
import { ensureBase, getModel, slideFromModel } from '../packages/core/models';
import type { Deck, PresentationSettings, SelectionInfo, Slide } from '../packages/core/types';

export interface DeckState {
  deck: Deck;
  currentIndex: number;
  selection: SelectionInfo | null;
  /** Seleção a aplicar no iframe depois de inserir um elemento. */
  pendingSelection: number[] | null;
  /** Entrar em modo de edição de texto ao aplicar a seleção pendente. */
  pendingEdit: boolean;
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
  requestSelection: (path: number[] | null, edit?: boolean) => void;
  /** Alterna o tema (`dark`/`light`) do slide. */
  setSlideTheme: (index: number, theme: 'dark' | 'light') => void;
  /** Define (ou remove, com `null`) o fundo CSS do slide. */
  setSlideBackground: (index: number, background: string | null) => void;
  /** Posição/escala do slide no espaço; `null` volta ao padrão. */
  setSlideLayout: (index: number, layout: Partial<SlideLayout> | null) => void;
  /** Como o slide entra na apresentação. */
  setSlideTransition: (index: number, transition: SlideTransition) => void;
  /** Liga/desliga o chat ao vivo no slide. */
  setSlideChat: (index: number, on: boolean) => void;
  /** Altera as preferências da apresentação (barra de progresso, modo, ao vivo). */
  setPresentationSettings: (patch: PresentationSettings) => void;
  /** Cria um slide a partir de um modelo, logo depois do slide atual. */
  addSlideFromTemplate: (kind: SlideTemplateKind) => void;
  /** Cria um slide a partir de um slide de um modelo (e traz a base dele, se faltar). */
  addSlideFromModel: (modelId: string, slideIndex: number) => void;
  /** Cria um slide base novo e o seleciona. */
  addBase: (theme?: 'dark' | 'light') => void;
  renameBase: (index: number, name: string) => void;
  /** Muda a base usada pelo slide (`null` = sem base). */
  setSlideBase: (index: number, baseId: string | null) => void;
  /** Copia o slide (ou base) atual para a área de transferência interna. */
  copySlide: (index: number) => void;
  /** Cola o slide copiado logo depois do atual. */
  pasteSlide: () => boolean;
  undo: () => void;
  redo: () => void;
  markSaved: (at?: number) => void;
}

interface Snapshot {
  deck: Deck;
  currentIndex: number;
}

/** Item da lista unificada: slides primeiro, depois os slides base. */
export function itemAt(deck: Deck, index: number): Slide | undefined {
  return index < deck.slides.length
    ? deck.slides[index]
    : (deck.bases ?? [])[index - deck.slides.length];
}

export const deckItems = (deck: Deck): Slide[] => [...deck.slides, ...(deck.bases ?? [])];

const cloneDeck = (deck: Deck): Deck => JSON.parse(JSON.stringify(deck)) as Deck;

const history = new HistoryManager<Snapshot>((snapshot) => ({
  deck: cloneDeck(snapshot.deck),
  currentIndex: snapshot.currentIndex,
}));

export const getSlideTitle = (slide: Slide): string => slideTitle(slide.html);

export const getSlideNotes = (slide: Slide): string => slideNotes(slide.html);

function normalizeDeck(deck: Deck): Deck {
  return {
    ...deck,
    slides: renumberFooters(deck.slides),
    ...(deck.bases ? { bases: deck.bases.map(upgradeBase) } : {}),
  };
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
    pendingEdit: false,
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
        deck.slides = renumberFooters(deck.slides);
      });
      const index = at ?? Math.max(0, get().deck.slides.length - 1);
      set({ currentIndex: Math.min(index, get().deck.slides.length - 1), selection: null });
    },

    deleteSlide: (index) => {
      const slideCount = get().deck.slides.length;
      if (index >= slideCount) {
        // Slide base: os slides que a usavam passam para outra base (ou ficam sem base).
        const bases = get().deck.bases ?? [];
        const doomed = bases[index - slideCount];
        if (!doomed) return;
        const doomedId = baseOwnId(doomed.html);
        const fallback = bases.find((b) => b !== doomed);
        const fallbackId = fallback ? baseOwnId(fallback.html) : null;
        apply((deck) => {
          deck.bases = (deck.bases ?? []).filter((b) => b.id !== doomed.id);
          deck.slides.forEach((slide) => {
            if (doomedId && slideBaseId(slide.html) === doomedId) {
              slide.html = withSlideBaseId(slide.html, fallbackId);
            }
          });
        });
        set({ currentIndex: Math.max(0, slideCount - 1), selection: null });
        return;
      }
      if (get().deck.slides.length <= 1) return;
      apply((deck) => {
        deck.slides.splice(index, 1);
        deck.slides = renumberFooters(deck.slides);
      });
      const nextIndex = Math.max(0, Math.min(get().currentIndex, get().deck.slides.length - 1));
      set({ currentIndex: nextIndex, selection: null });
    },

    duplicateSlide: (index) => {
      const slideCount = get().deck.slides.length;
      if (index >= slideCount) {
        const source = (get().deck.bases ?? [])[index - slideCount];
        if (!source) return;
        const html = withBaseName(
          source.html.replace(/data-base-id="[^"]*"/, `data-base-id="${newBaseId()}"`),
          `${baseName(source.html)} (cópia)`
        );
        apply((deck) => {
          deck.bases = [...(deck.bases ?? []), { id: newSlideId(), html }];
        });
        set({ currentIndex: slideCount + (get().deck.bases?.length ?? 1) - 1, selection: null });
        return;
      }
      const source = get().deck.slides[index];
      if (!source) return;
      apply((deck) => {
        deck.slides.splice(index + 1, 0, makeSlide(source.html));
        deck.slides = renumberFooters(deck.slides);
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
        deck.slides = renumberFooters(deck.slides);
      });
      set({ currentIndex: to, selection: null });
    },

    updateSlideHTML: (index, html, coalesceKey) => {
      apply((deck) => {
        const slide = itemAt(deck, index);
        if (slide) slide.html = html;
      }, coalesceKey);
    },

    updateElementHTML: (path, innerHTML) => {
      const [slideIndex, ...rest] = path;
      if (slideIndex === undefined || rest.length === 0) return;
      const slide = itemAt(get().deck, slideIndex);
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
      const slide = itemAt(get().deck, slideIndex);
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
        const doc = new DOMParser().parseFromString(slide.html, 'text/html');
        const section = doc.body.firstElementChild;
        if (!section) return;
        section.setAttribute('data-notes', notes);
        slide.html = section.outerHTML;
      }, `notes:${index}`);
    },

    setTitle: (title) => {
      apply((deck) => {
        deck.title = title;
      }, 'title');
    },

    selectSlide: (index) => {
      const count = get().deck.slides.length + (get().deck.bases?.length ?? 0);
      if (index < 0 || index >= count) return;
      set({ currentIndex: index, selection: null });
    },

    setSelection: (selection) => set({ selection }),

    requestSelection: (path, edit = false) => set({ pendingSelection: path, pendingEdit: edit }),

    setSlideTheme: (index, theme) => {
      const slide = itemAt(get().deck, index);
      if (!slide) return;
      get().updateSlideHTML(index, withSlideClass(slide.html, theme), `theme:${index}`);
    },

    setSlideBackground: (index, background) => {
      const slide = itemAt(get().deck, index);
      if (!slide) return;
      get().updateSlideHTML(index, withSlideBackground(slide.html, background), `bg:${index}`);
    },

    setSlideLayout: (index, layout) => {
      const slide = get().deck.slides[index];
      if (!slide) return;
      get().updateSlideHTML(index, withSlideLayout(slide.html, layout), `layout:${index}`);
    },

    setSlideTransition: (index, transition) => {
      const slide = get().deck.slides[index];
      if (!slide) return;
      get().updateSlideHTML(index, withSlideTransition(slide.html, transition), `trans:${index}`);
    },

    addSlideFromModel: (modelId, slideIndex) => {
      const model = getModel(modelId);
      const picked = model.slides[slideIndex];
      if (!picked) return;
      const state = get();
      const at = Math.min(state.currentIndex + 1, state.deck.slides.length);
      const bases = ensureBase(state.deck, modelId, picked.base);
      apply((deck) => {
        deck.bases = bases;
        deck.modelId = deck.modelId ?? modelId;
        deck.slides.splice(at, 0, slideFromModel(picked));
        deck.slides = renumberFooters(deck.slides);
      });
      set({ currentIndex: at, selection: null });
    },

    addBase: (theme = 'dark') => {
      const id = newBaseId();
      const base = makeBase(id, `Base ${(get().deck.bases?.length ?? 0) + 1}`, theme);
      apply((deck) => {
        deck.bases = [...(deck.bases ?? []), base];
      });
      set({ currentIndex: get().deck.slides.length + (get().deck.bases?.length ?? 1) - 1 });
    },

    renameBase: (index, name) => {
      const item = itemAt(get().deck, index);
      if (!item || index < get().deck.slides.length) return;
      get().updateSlideHTML(index, withBaseName(item.html, name), `basename:${index}`);
    },

    setSlideBase: (index, baseId) => {
      const slide = get().deck.slides[index];
      if (!slide) return;
      get().updateSlideHTML(index, withSlideBaseId(slide.html, baseId), `base:${index}`);
    },

    copySlide: (index) => {
      const item = itemAt(get().deck, index);
      if (!item) return;
      window.__mmClip = {
        kind: 'slide',
        html: item.html,
        isBase: index >= get().deck.slides.length,
      };
    },

    pasteSlide: () => {
      const clip = window.__mmClip;
      if (!clip || clip.kind !== 'slide') return false;
      const state = get();
      const slideCount = state.deck.slides.length;
      if (clip.isBase) {
        const html = withBaseName(
          clip.html.replace(/data-base-id="[^"]*"/, `data-base-id="${newBaseId()}"`),
          `${baseName(clip.html)} (cópia)`
        );
        apply((deck) => {
          deck.bases = [...(deck.bases ?? []), { id: newSlideId(), html }];
        });
        set({ currentIndex: slideCount + (get().deck.bases?.length ?? 1) - 1, selection: null });
        return true;
      }
      const at = Math.min(state.currentIndex + 1, slideCount);
      apply((deck) => {
        deck.slides.splice(at, 0, { id: newSlideId(), html: clip.html });
        deck.slides = renumberFooters(deck.slides);
      });
      set({ currentIndex: at, selection: null });
      return true;
    },

    setSlideChat: (index, on) => {
      const slide = get().deck.slides[index];
      if (!slide) return;
      get().updateSlideHTML(index, withSlideChat(slide.html, on), `chat:${index}`);
    },

    setPresentationSettings: (patch) => {
      apply((deck) => {
        deck.settings = { ...deck.settings, ...patch };
      }, 'settings');
    },

    addSlideFromTemplate: (kind) => {
      const at = get().currentIndex + 1;
      get().addSlide(slideTemplateHTML(kind), at);
    },

    undo: () => {
      const previous = history.undo(snapshot());
      if (!previous) return;
      set({
        deck: previous.deck,
        currentIndex: Math.min(
          previous.currentIndex,
          previous.deck.slides.length + (previous.deck.bases?.length ?? 0) - 1
        ),
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
        currentIndex: Math.min(
          next.currentIndex,
          next.deck.slides.length + (next.deck.bases?.length ?? 0) - 1
        ),
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
