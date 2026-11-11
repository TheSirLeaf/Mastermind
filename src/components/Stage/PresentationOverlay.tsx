import { buildPresentationHTML, loadTemplate } from '@packages/core/export';
import { registry } from '@packages/core/PackageRegistry';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface PresentationOverlayProps {
  mode: 'preview' | 'present';
}

/** Mostra o deck real (HTML autônomo) por cima do editor. */
export function PresentationOverlay({ mode }: PresentationOverlayProps) {
  const deck = useDeckStore((state) => state.deck);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const setPreviewMode = useUIStore((state) => state.setPreviewMode);
  const setPresenting = useUIStore((state) => state.setPresenting);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // O deck é fotografado ao abrir; mudanças no editor não afetam o overlay.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const template = await loadTemplate();
        if (cancelled) return;
        const start = currentIndex + 1;
        const next = buildPresentationHTML({ template, deck, registry }).replace(
          '</body>',
          `<script>try{location.hash='#${start}'}catch(e){}</script></body>`
        );
        setHtml(next);
      } catch {
        if (!cancelled) setError('Não foi possível montar a apresentação.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const close = () => {
      setPreviewMode(false);
      setPresenting(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    if (mode === 'present') {
      void wrapperRef.current?.requestFullscreen?.().catch(() => undefined);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, setPreviewMode, setPresenting]);

  const close = () => {
    setPreviewMode(false);
    setPresenting(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-[10000] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'present' ? 'Apresentação' : 'Visualização'}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-[#10060B] px-3 text-xs text-[#F3E6E2]/70">
        <span>
          {mode === 'present' ? 'Apresentando' : 'Visualizando'} · slide {currentIndex + 1} de{' '}
          {deck.slides.length}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-2 py-1 transition hover:bg-white/10 hover:text-[#F7D98B]"
          onClick={close}
        >
          <X className="h-4 w-4" /> Fechar (Esc)
        </button>
      </div>
      {error ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[#F3E6E2]/60">
          {error}
        </div>
      ) : html ? (
        <iframe
          className="min-h-0 flex-1 border-0 bg-black"
          title={mode === 'present' ? 'Apresentação' : 'Visualização'}
          srcDoc={html}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-[#F3E6E2]/60">
          Preparando…
        </div>
      )}
    </div>
  );
}
