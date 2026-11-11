// components/Stage/Stage.tsx
import { buildEditorHTML } from '@packages/core/export';
import { IframeBridge } from '@packages/core/iframeBridge';
import { registry } from '@packages/core/PackageRegistry';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { useRef, useEffect, useState } from 'react';

import { setActiveBridge } from '../../editor/bridgeRef';
import { handleDroppedFile } from '../../editor/actions';
import { handleBridgeKey } from '../../editor/shortcuts';

export function Stage() {
  const { deck, currentIndex, pendingSelection, pendingEdit } = useDeckStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<IframeBridge | null>(null);
  const lastSlidesRef = useRef<string[]>([]);
  const lastIdsRef = useRef<string[]>([]);
  const lastPreviewRef = useRef(0);
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
    });
    bridgeRef.current = bridge;
    setActiveBridge(bridge);

    const initialDeck = useDeckStore.getState().deck;
    lastSlidesRef.current = initialDeck.slides.map((slide) => slide.html);
    lastIdsRef.current = initialDeck.slides.map((slide) => slide.id);
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
    const current = deck.slides.map((slide) => slide.html);
    const previousIds = lastIdsRef.current;
    const currentIds = deck.slides.map((slide) => slide.id);
    const structural =
      previous.length !== current.length ||
      previousIds.length !== currentIds.length ||
      previousIds.some((id, index) => id !== currentIds[index]);

    if (structural) {
      bridge.load(buildEditorHTML(deck, registry));
      bridge.goto(currentIndex);
      lastSlidesRef.current = current;
      lastIdsRef.current = currentIds;
      return;
    }

    // Updates to specific slide HTML without reloading iframe
    current.forEach((html, index) => {
      if (previous[index] !== html && previous.length === current.length) {
        bridge.setSlideHTML(index, html);
      }
    });
    lastSlidesRef.current = current;
    lastIdsRef.current = currentIds;
  }, [deck, booted, currentIndex]);

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
