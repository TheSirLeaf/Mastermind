// components/Stage/StageViewport.tsx
// Área central. Dois modos sobre o mesmo palco (iframe):
//  - um slide: sempre cabe na região disponível; scroll dá zoom e o botão do meio move;
//  - visão geral ("canvas"): todos os slides lado a lado; escolher um slide move a visão até ele.
import { useDeckStore } from '@store/deckStore';
import { clsx } from 'clsx';
import { Maximize2, ScanSearch } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

import { getActiveBridge } from '../../editor/bridgeRef';
import { setStageViewHandlers } from '../../editor/stageView';
import { Tooltip } from '../common/Tooltip';

import { Stage } from './Stage';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;
const PADDING = 32;

/** Medidas do slide e do espaço entre slides na visão geral (px do documento do palco). */
const SLIDE_W = 1920;
const SLIDE_H = 1080;
const CANVAS_GAP = 160;
const CANVAS_MARGIN = 48;

interface View {
  zoom: number;
  x: number;
  y: number;
}

const FIT: View = { zoom: 1, x: 0, y: 0 };

interface StageViewportProps {
  highlighted?: boolean;
  /** Visão geral: todos os slides ao mesmo tempo. */
  canvas?: boolean;
}

export function StageViewport({ highlighted, canvas = false }: StageViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>(FIT);
  const [cv, setCv] = useState<View>(FIT);
  const viewRef = useRef(view);
  viewRef.current = view;
  const cvRef = useRef(cv);
  cvRef.current = cv;
  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const slideCount = useDeckStore((state) => state.deck.slides.length);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    observer.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Largura do slide no zoom 100%: o maior 16:9 que cabe com margem.
  const baseW = Math.max(240, Math.min(size.w - PADDING * 2, ((size.h - PADDING * 2) * 16) / 9));
  const baseH = (baseW * 9) / 16;

  /* ---------------------------- um slide por vez ---------------------------- */

  /** Zoom mantendo fixo o ponto (px, py), em coordenadas do container. */
  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    const el = containerRef.current;
    if (!el) return;
    const current = viewRef.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor));
    const ratio = next / current.zoom;
    const cx = el.clientWidth / 2 + current.x;
    const cy = el.clientHeight / 2 + current.y;
    setView({
      zoom: next,
      x: current.x + (px - cx) * (1 - ratio),
      y: current.y + (py - cy) * (1 - ratio),
    });
  }, []);

  /* ------------------------------ visão geral ------------------------------ */

  const applyCanvas = useCallback((next: View, animate: boolean) => {
    setCv(next);
    getActiveBridge()?.setView({ ...next, animate });
  }, []);

  /** Enquadra o slide `index` (ou todos, com `index = null`) no centro da área. */
  const frame = useCallback(
    (index: number | null, animate: boolean) => {
      const el = containerRef.current;
      if (!el || el.clientWidth === 0) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const span =
        index === null ? slideCount * SLIDE_W + Math.max(0, slideCount - 1) * CANVAS_GAP : SLIDE_W;
      const zoom = Math.min((cw - CANVAS_MARGIN * 2) / span, (ch - CANVAS_MARGIN * 2) / SLIDE_H);
      const offset = index === null ? 0 : index * (SLIDE_W + CANVAS_GAP);
      applyCanvas(
        { zoom, x: (cw - span * zoom) / 2 - offset * zoom, y: (ch - SLIDE_H * zoom) / 2 },
        animate
      );
    },
    [applyCanvas, slideCount]
  );

  const canvasZoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      const current = cvRef.current;
      const next = Math.min(2, Math.max(0.04, current.zoom * factor));
      const ratio = next / current.zoom;
      applyCanvas(
        { zoom: next, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio },
        false
      );
    },
    [applyCanvas]
  );

  // Entrar/sair da visão geral e acompanhar o slide escolhido no menu da esquerda.
  useEffect(() => {
    getActiveBridge()?.setMode(canvas ? 'canvas' : 'slide');
    if (canvas) frame(currentIndex, false);
    // O enquadramento não deve refazer sozinho quando só o tamanho muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas]);

  useEffect(() => {
    if (canvas) frame(currentIndex, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    if (canvas && size.w > 0) frame(currentIndex, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w > 0]);

  /* ------------------------------- ponteiro -------------------------------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (canvasRef.current) canvasZoomAt(factor, px, py);
      else zoomAt(factor, px, py);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, canvasZoomAt]);

  // Eventos vindos de dentro do iframe do palco.
  useEffect(() => {
    setStageViewHandlers({
      wheel: (deltaY, x, y) => {
        const factor = Math.exp(-deltaY * 0.0015);
        if (canvasRef.current) {
          // Na visão geral o iframe ocupa toda a área: x, y já são do container.
          canvasZoomAt(factor, x, y);
          return;
        }
        const el = containerRef.current;
        const wrapper = wrapperRef.current;
        if (!el || !wrapper) return;
        const box = el.getBoundingClientRect();
        const slide = wrapper.getBoundingClientRect();
        const zoom = viewRef.current.zoom;
        zoomAt(factor, slide.left + x * zoom - box.left, slide.top + y * zoom - box.top);
      },
      pan: (dx, dy) => {
        if (canvasRef.current) {
          const current = cvRef.current;
          applyCanvas({ ...current, x: current.x + dx, y: current.y + dy }, false);
        } else setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      },
    });
    return () => setStageViewHandlers(null);
  }, [zoomAt, canvasZoomAt, applyCanvas]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 1) return;
    event.preventDefault();
    panRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const last = panRef.current;
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    panRef.current = { x: event.clientX, y: event.clientY };
    if (canvasRef.current) {
      const current = cvRef.current;
      applyCanvas({ ...current, x: current.x + dx, y: current.y + dy }, false);
    } else setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const endPan = () => {
    panRef.current = null;
  };

  const changed = view.zoom !== 1 || view.x !== 0 || view.y !== 0;

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
        ref={wrapperRef}
        className={clsx(
          'absolute overflow-hidden',
          !canvas && 'rounded-lg shadow-[0_30px_70px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/10',
          highlighted && 'outline-2 outline-accent outline-offset-[-2px]'
        )}
        style={
          canvas
            ? { left: 0, top: 0, width: size.w, height: size.h }
            : {
                width: baseW,
                height: baseH,
                left: (size.w - baseW) / 2 + view.x,
                top: (size.h - baseH) / 2 + view.y,
                transform: `scale(${view.zoom})`,
                transformOrigin: 'center',
              }
        }
      >
        <Stage />
      </div>

      <div className="absolute bottom-2 right-3 flex items-center gap-1 rounded-md border border-white/10 bg-[#141414]/90 px-1.5 py-1 text-[11px] text-payday-textMuted">
        <span className="w-9 text-right tabular-nums">
          {Math.round((canvas ? cv.zoom : view.zoom) * 100)}%
        </span>
        {canvas ? (
          <>
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
          </>
        ) : (
          <Tooltip
            title="Ajustar à tela"
            description="Volta o zoom e a posição. Scroll dá zoom; botão do meio move."
            side="top"
            disabled={!changed}
          >
            <button
              type="button"
              aria-label="Ajustar à tela"
              disabled={!changed}
              onClick={() => setView(FIT)}
              className="grid h-5 w-5 place-items-center rounded transition hover:bg-white/10 hover:text-accent disabled:opacity-35"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
