// Área de transferência interna do editor (slides e elementos).
// Fica em `window` para que o iframe do palco (mesma origem) leia e grave a mesma coisa.
export interface ElementClip {
  kind: 'element';
  html: string;
  /** Índice do slide de onde veio e posição do elemento dentro dele (px locais do slide). */
  slide: number;
  left: number;
  top: number;
}

export interface SlideClip {
  kind: 'slide';
  html: string;
  isBase: boolean;
}

export type EditorClip = ElementClip | SlideClip;

declare global {
  interface Window {
    __mmClip?: EditorClip;
  }
}
