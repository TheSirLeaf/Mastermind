// components/Stage/StageViewport.tsx
// Área central: um espaço único com TODOS os slides (nas abas Editor, Animação e Slide).
// A câmera (zoom/posição) é daqui: escolher um slide no menu da esquerda a leva até ele;
// scroll dá zoom e o botão do meio move. Na aba Slide os slides podem ser movidos e redimensionados.
import { slideLayout, SLIDE_GAP, SLIDE_H, SLIDE_W } from '@packages/core/deck';
import { useDeckStore } from '@store/deckStore';
import { clsx } from 'clsx';
import { Maximize2, ScanSearch } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

import { getActiveBridge } from '../../editor/bridgeRef';
import { consumeCanvasClick, setStageViewHandlers } from '../../editor/stageView';
import { Tooltip } from '../common/Tooltip';

import { Stage } from './Stage';

const CANVAS_MARGIN = 48;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 6;

interface View {
  zoom: number;
  x: number;
  y: number;
}

interface StageViewportProps {
  highlighted?: boolean;
  /** Aba Slide: arrastar move o slide e a alça redimensiona. */
  arrange?: boolean;
}

export function StageViewport({ highlighted, arrange = false }: StageViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cv, setCv] = useState<View>({ zoom: 0.25, x: 0, y: 0 });
  const cvRef = useRef(cv);
  cvRef.current = cv;
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const slides = useDeckStore((state) => state.deck.slides);
  const bases = useDeckStore((state) => state.deck.bases);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const basesRef = useRef(bases);
  basesRef.current = bases;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  const applyView = useCallback((next: View, animate: boolean) => {
    setCv(next);
    getActiveBridge()?.setView({ ...next, animate });
  }, []);

  /** Enquadra o slide `index` (ou o conjunto de todos, com `null`) no centro da área. */
  const frame = useCallback(
    (index: number | null, animate: boolean) => {
      const el = containerRef.current;
      if (!el || el.clientWidth === 0) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const boxes = slidesRef.current.map((slide, i) => {
        const l = slideLayout(slide.html, i);
        return { x: l.x, y: l.y, w: SLIDE_W * l.s, h: SLIDE_H * l.s };
      });
      // Slides base: uma linha acima dos slides (mesma regra do motor do palco).
      (basesRef.current ?? []).forEach((_base, k) => {
        boxes.push({ x: k * (SLIDE_W + SLIDE_GAP), y: -(SLIDE_H + 380), w: SLIDE_W, h: SLIDE_H });
      });
      const picked = index === null ? boxes : boxes.slice(index, index + 1);
      if (picked.length === 0) return;
      const minX = Math.min(...picked.map((b) => b.x));
      const minY = Math.min(...picked.map((b) => b.y));
      const maxX = Math.max(...picked.map((b) => b.x + b.w));
      const maxY = Math.max(...picked.map((b) => b.y + b.h));
      const spanW = maxX - minX;
      const spanH = maxY - minY;
      const zoom = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          Math.min((cw - CANVAS_MARGIN * 2) / spanW, (ch - CANVAS_MARGIN * 2) / spanH)
        )
      );
      applyView(
        {
          zoom,
          x: (cw - spanW * zoom) / 2 - minX * zoom,
          y: (ch - spanH * zoom) / 2 - minY * zoom,
        },
        animate
      );
    },
    [applyView]
  );

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      const current = cvRef.current;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
      const ratio = next / current.zoom;
      applyView(
        { zoom: next, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio },
        false
      );
    },
    [applyView]
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const current = cvRef.current;
      applyView({ ...current, x: current.x + dx, y: current.y + dy }, false);
    },
    [applyView]
  );

  // Modo do palco: editar elementos ou arranjar os slides.
  useEffect(() => {
    getActiveBridge()?.setMode(arrange ? 'arrange' : 'edit');
  }, [arrange]);

  // Primeiro enquadramento (quando a área já tem tamanho).
  const ready = size.w > 0;
  useEffect(() => {
    if (ready) frame(useDeckStore.getState().currentIndex, false);
    // Só no primeiro enquadramento: depois a câmera é do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Escolher outro slide (menu da esquerda, atalhos) leva a câmera até ele.
  // Clicar direto no slide dentro do espaço NÃO move a câmera.
  const previousIndex = useRef(currentIndex);
  useEffect(() => {
    if (previousIndex.current === currentIndex) return;
    previousIndex.current = currentIndex;
    if (consumeCanvasClick()) return;
    frame(currentIndex, true);
  }, [currentIndex, frame]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Eventos vindos de dentro do iframe do palco (que ocupa toda a área).
  useEffect(() => {
    setStageViewHandlers({
      wheel: (deltaY, x, y) => zoomAt(Math.exp(-deltaY * 0.0015), x, y),
      pan: panBy,
    });
    return () => setStageViewHandlers(null);
  }, [zoomAt, panBy]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 1) return;
    event.preventDefault();
    panRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const last = panRef.current;
    if (!last) return;
    panRef.current = { x: event.clientX, y: event.clientY };
    panBy(event.clientX - last.x, event.clientY - last.y);
  };
  const endPan = () => {
    panRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onAuxClick={(event) => event.preventDefault()}
    >
      <div
        className={clsx(
          'absolute inset-0 overflow-hidden',
          highlighted && 'outline-2 outline-accent outline-offset-[-2px]'
        )}
      >
        <Stage />
      </div>

      <div className="absolute bottom-2 right-3 flex items-center gap-1 rounded-md border border-white/10 bg-payday-surface/90 px-1.5 py-1 text-[11px] text-payday-textMuted">
        <span className="w-9 text-right tabular-nums">{Math.round(cv.zoom * 100)}%</span>
        <Tooltip
          title="Ir para o slide atual"
          description="Enquadra o slide selecionado. Scroll dá zoom; botão do meio move."
          side="top"
        >
          <button
            type="button"
            aria-label="Ir para o slide atual"
            onClick={() => frame(currentIndex, true)}
            className="grid h-5 w-5 place-items-center rounded transition hover:bg-white/10 hover:text-accent"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </Tooltip>
        <Tooltip title="Ver todos os slides" description="Afasta para mostrar tudo." side="top">
          <button
            type="button"
            aria-label="Ver todos os slides"
            onClick={() => frame(null, true)}
            className="grid h-5 w-5 place-items-center rounded transition hover:bg-white/10 hover:text-accent"
          >
            <ScanSearch className="h-3 w-3" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
