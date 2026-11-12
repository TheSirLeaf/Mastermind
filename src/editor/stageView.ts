/** Ponte entre o palco (iframe) e a área de visualização com zoom/pan. */
export interface StageViewHandlers {
  /** Scroll com o ponteiro dentro do iframe (coordenadas do iframe). */
  wheel: (deltaY: number, x: number, y: number) => void;
  /** Deslocamento do botão do meio, em px da tela. */
  pan: (dx: number, dy: number) => void;
}

let handlers: StageViewHandlers | null = null;

export function setStageViewHandlers(next: StageViewHandlers | null): void {
  handlers = next;
}

export function getStageViewHandlers(): StageViewHandlers | null {
  return handlers;
}

/**
 * Clicar num slide dentro do espaço o torna o atual SEM mover a câmera. A seleção
 * pelo menu da esquerda, ao contrário, leva a câmera até ele.
 */
let canvasClick = false;

export function markCanvasClick(): void {
  canvasClick = true;
}

/** `true` (uma vez) quando a mudança de slide veio de um clique no espaço. */
export function consumeCanvasClick(): boolean {
  const was = canvasClick;
  canvasClick = false;
  return was;
}
