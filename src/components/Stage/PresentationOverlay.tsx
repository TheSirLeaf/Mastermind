import { buildPresentationHTML, loadTemplate } from '@packages/core/export';
import { registry } from '@packages/core/PackageRegistry';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { useEffect, useRef, useState } from 'react';

interface PresentationOverlayProps {
  mode: 'preview' | 'present';
}

/**
 * Roda dentro da apresentação: leva o foco para o documento (as setas funcionam
 * sem clicar antes) e avisa o editor quando o usuário aperta Esc.
 */
const FRAME_SCRIPT = `<script>(function(){
  try{window.focus()}catch(e){}
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){try{parent.postMessage({__mm:'present-exit'},'*')}catch(x){}}
  },true);
})()</script>`;

/** Mostra o deck real (HTML autônomo) em tela cheia, sem barras, por cima do editor. */
export function PresentationOverlay({ mode }: PresentationOverlayProps) {
  const deck = useDeckStore((state) => state.deck);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const setPreviewMode = useUIStore((state) => state.setPreviewMode);
  const setPresenting = useUIStore((state) => state.setPresenting);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closing = useRef(false);

  // O deck é fotografado ao abrir; mudanças no editor não afetam o overlay.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const template = await loadTemplate();
        if (cancelled) return;
        const start = Math.min(currentIndex, deck.slides.length - 1) + 1;
        const next = buildPresentationHTML({ template, deck, registry }).replace(
          '</body>',
          `<script>try{location.hash='#${start}'}catch(e){}</script>${FRAME_SCRIPT}</body>`
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
      if (closing.current) return;
      closing.current = true;
      setPreviewMode(false);
      setPresenting(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { __mm?: string } | undefined;
      if (event.source === frameRef.current?.contentWindow && data?.__mm === 'present-exit') {
        close();
      }
    };
    // O Esc em tela cheia é consumido pelo navegador: sair do fullscreen encerra a apresentação.
    const onFullscreen = () => {
      if (mode === 'present' && !document.fullscreenElement) close();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('message', onMessage);
    document.addEventListener('fullscreenchange', onFullscreen);
    if (mode === 'present') {
      void wrapperRef.current?.requestFullscreen?.().catch(() => undefined);
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('message', onMessage);
      document.removeEventListener('fullscreenchange', onFullscreen);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [mode, setPreviewMode, setPresenting]);

  const focusFrame = () => {
    const win = frameRef.current?.contentWindow;
    try {
      frameRef.current?.focus();
      win?.focus();
    } catch {
      // Sem acesso ao foco: o primeiro clique no slide assume o teclado.
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-[10000] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'present' ? 'Apresentação' : 'Visualização'}
    >
      {error ? (
        <div className="flex h-full items-center justify-center text-sm text-payday-text/60">
          {error}
        </div>
      ) : html ? (
        <iframe
          ref={frameRef}
          className="h-full w-full border-0 bg-black"
          title={mode === 'present' ? 'Apresentação' : 'Visualização'}
          srcDoc={html}
          onLoad={focusFrame}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-payday-text/60">
          Preparando…
        </div>
      )}
    </div>
  );
}
