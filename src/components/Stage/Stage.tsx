// components/Stage/Stage.tsx
import {
  baseIndexForSlide,
  baseOwnId,
  resolveDeckSlides,
  slidesUsingBase,
} from '@packages/core/bases';
import { buildEditorHTML } from '@packages/core/export';
import { IframeBridge } from '@packages/core/iframeBridge';
import { registry } from '@packages/core/PackageRegistry';
import { deckItems, useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { useRef, useEffect, useState } from 'react';

import { handleDroppedFile } from '../../editor/actions';
import { setActiveBridge } from '../../editor/bridgeRef';
import { handleBridgeKey } from '../../editor/shortcuts';
import { getStageViewHandlers, markCanvasClick } from '../../editor/stageView';

export function Stage() {
  const { deck, currentIndex, pendingSelection, pendingEdit } = useDeckStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<IframeBridge | null>(null);
  const lastSlidesRef = useRef<string[]>([]);
  const lastIdsRef = useRef<string[]>([]);
  // Bases já refletidas nos slides que as usam (a edição vinda do iframe não reenvia a si mesma).
  const lastBasesRef = useRef<string[]>([]);
  const lastPreviewRef = useRef(0);
  const workspace = useUIStore((state) => state.workspace);
  const previewNonce = useUIStore((state) => state.animationPreviewNonce);
  const [booted, setBooted] = useState(false);

  // Initialize iframe bridge once. Deck edits are applied by the effects below;
  // re-running this on every deck change would reload the iframe and drop the
  // current selection.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const bridge = new IframeBridge(iframe, {
      onSelect: (value) => useDeckStore.getState().setSelection(value),
      onEdit: (path, html) => useDeckStore.getState().updateElementHTML(path, html),
      onSlideChange: (index) => useDeckStore.getState().selectSlide(index),
      // O iframe é a fonte da verdade em mover/redimensionar/digitar: registra o
      // HTML limpo no store e marca como já aplicado para não ecoar `set-slide`.
      onSlideHTML: (index, html, key) => {
        lastSlidesRef.current[index] = html;
        useDeckStore.getState().updateSlideHTML(index, html, key || undefined);
      },
      onKey: (key) => handleBridgeKey(key),
      onDropFile: (file) => handleDroppedFile(file),
      onWheel: (dy, x, y) => getStageViewHandlers()?.wheel(dy, x, y),
      onSlideClick: (index) => {
        const deckState = useDeckStore.getState();
        // Clique direto no slide: troca o atual, mas a câmera fica onde está.
        if (index !== deckState.currentIndex) markCanvasClick();
        deckState.selectSlide(index);
      },
      onSlideOpen: (index) => {
        useDeckStore.getState().selectSlide(index);
        useUIStore.getState().setWorkspace('editor');
      },
      onElementMoved: (index, path) => {
        const deckState = useDeckStore.getState();
        if (index !== deckState.currentIndex) markCanvasClick();
        deckState.selectSlide(index);
        deckState.requestSelection(path);
      },
      onPalette: (colors) => useUIStore.getState().setSlidePalette(colors),
      onPan: (dx, dy) => getStageViewHandlers()?.pan(dx, dy),
    });
    bridgeRef.current = bridge;
    setActiveBridge(bridge);

    const initialDeck = useDeckStore.getState().deck;
    const initialItems = deckItems(initialDeck);
    lastSlidesRef.current = initialItems.map((slide) => slide.html);
    lastIdsRef.current = initialItems.map((slide) => slide.id);
    lastBasesRef.current = (initialDeck.bases ?? []).map((base) => base.html);
    bridge.load(buildEditorHTML(initialDeck, registry));
    // O `goto` é enfileirado até o iframe anunciar `ready`; sem isso o primeiro
    // slide nunca recebe `.active` e o palco abre em branco.
    bridge.goto(useDeckStore.getState().currentIndex);
    setBooted(true);

    return () => {
      bridge.destroy();
      bridgeRef.current = null;
      setActiveBridge(null);
      setBooted(false);
    };
  }, []);

  // Navigation: reload document when deck changes structurally
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge || !booted) return;
    bridge.goto(currentIndex);
  }, [currentIndex, booted]);

  // Replay requested by the Animation tab. This effect runs after the deck
  // effect above, so a just-applied patch is already in the iframe.
  useEffect(() => {
    if (!booted || previewNonce === lastPreviewRef.current) return;
    lastPreviewRef.current = previewNonce;
    bridgeRef.current?.previewAnimations();
  }, [previewNonce, booted]);

  // Update iframe when deck changes
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge || !booted) return;
    const previous = lastSlidesRef.current;
    const items = deckItems(deck);
    const current = items.map((slide) => slide.html);
    const previousIds = lastIdsRef.current;
    const currentIds = items.map((slide) => slide.id);
    const structural =
      previous.length !== current.length ||
      previousIds.length !== currentIds.length ||
      previousIds.some((id, index) => id !== currentIds[index]);

    if (structural) {
      bridge.load(buildEditorHTML(deck, registry));
      bridge.goto(currentIndex);
      lastSlidesRef.current = current;
      lastIdsRef.current = currentIds;
      lastBasesRef.current = (deck.bases ?? []).map((base) => base.html);
      return;
    }

    // Updates to specific slide HTML without reloading iframe. Uma base alterada
    // também atualiza (com a camada nova) todos os slides que a usam.
    const resolved = resolveDeckSlides(deck);
    const slideCount = deck.slides.length;
    const toSend = new Set<number>();
    current.forEach((html, index) => {
      if (previous[index] === html || previous.length !== current.length) return;
      toSend.add(index);
      if (index >= slideCount) {
        const id = baseOwnId(html);
        if (id) slidesUsingBase(deck, id).forEach((i) => toSend.add(i));
      }
    });
    (deck.bases ?? []).forEach((base, k) => {
      if (lastBasesRef.current[k] === base.html) return;
      const id = baseOwnId(base.html);
      if (id) slidesUsingBase(deck, id).forEach((i) => toSend.add(i));
    });
    lastBasesRef.current = (deck.bases ?? []).map((base) => base.html);
    toSend.forEach((index) => {
      bridge.setSlideHTML(
        index,
        index < slideCount ? (resolved[index] ?? '') : (current[index] ?? '')
      );
    });
    lastSlidesRef.current = current;
    lastIdsRef.current = currentIds;
  }, [deck, booted, currentIndex]);

  // Aba Slides: paleta de cores do slide ativo (espera o DOM assentar depois de cada mudança).
  useEffect(() => {
    if (!booted || workspace !== 'slide') return;
    const timer = window.setTimeout(() => bridgeRef.current?.requestPalette(), 400);
    return () => window.clearTimeout(timer);
  }, [booted, workspace, currentIndex, deck]);

  // Aba Slides: destaque azul entre um slide base e os slides que o usam.
  useEffect(() => {
    if (!booted) return;
    const slideCount = deck.slides.length;
    let indices: number[] = [];
    if (workspace === 'slide') {
      if (currentIndex >= slideCount) {
        const id = baseOwnId(deck.bases?.[currentIndex - slideCount]?.html ?? '');
        indices = id ? slidesUsingBase(deck, id) : [];
      } else {
        const base = baseIndexForSlide(deck, currentIndex);
        indices = base === null ? [] : [base];
      }
    }
    bridgeRef.current?.highlight(indices);
  }, [booted, workspace, currentIndex, deck]);

  // Depois de inserir um elemento, o store pede a seleção dele. Este efeito
  // fica após o efeito do deck para que o `set-slide` já tenha sido enviado.
  useEffect(() => {
    if (!booted || !pendingSelection) return;
    bridgeRef.current?.select(pendingSelection, pendingEdit);
    useDeckStore.getState().requestSelection(null);
  }, [pendingSelection, pendingEdit, booted]);

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full border-0 bg-payday-bg"
      title="Palco da apresentação"
    />
  );
}
