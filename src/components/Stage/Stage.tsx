// components/Stage/Stage.tsx
import { buildEditorHTML } from '@packages/core/export';
import { IframeBridge } from '@packages/core/iframeBridge';
import { registry } from '@packages/core/PackageRegistry';
import { useDeckStore } from '@store/deckStore';
import { useRef, useEffect, useState } from 'react';

export function Stage() {
  const { deck, currentIndex } = useDeckStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<IframeBridge | null>(null);
  const lastSlidesRef = useRef<string[]>([]);
  const lastIdsRef = useRef<string[]>([]);
  const [booted, setBooted] = useState(false);

  // Initialize iframe bridge
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const bridge = new IframeBridge(iframe, {
      onSelect: (value) => useDeckStore.getState().setSelection(value),
      onEdit: (path, html) => useDeckStore.getState().updateElementHTML(path, html),
      onSlideChange: (index) => useDeckStore.getState().selectSlide(index),
    });
    bridgeRef.current = bridge;

    const html = buildEditorHTML(deck, registry);
    lastSlidesRef.current = deck.slides.map((slide) => slide.html);
    lastIdsRef.current = deck.slides.map((slide) => slide.id);
    bridge.load(html);
    setBooted(true);

    return () => {
      bridge.destroy();
      bridgeRef.current = null;
      setBooted(false);
    };
  }, [deck]);

  // Navigation: reload document when deck changes structurally
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge || !booted) return;
    bridge.goto(currentIndex);
  }, [currentIndex, booted]);

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
      lastSlidesRef.current = current;
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
  }, [deck, booted]);

  return (
    <iframe
      ref={iframeRef}
      className="h-full w-full border-0 bg-[#10060B]"
      title="Palco da apresentação"
    />
  );
}
