import type { ElementPatch } from './animation';
import type { SelectionInfo } from './types';

export interface BridgeEvents {
  onReady?: (slideCount: number) => void;
  onSelect?: (selection: SelectionInfo | null) => void;
  onEdit?: (path: number[], html: string) => void;
  onSlideChange?: (index: number) => void;
}

type DeckMessage =
  | { __mm: 'deck'; type: 'ready'; count: number }
  | { __mm: 'deck'; type: 'select'; path: number[] | null; tag: string; label: string }
  | { __mm: 'deck'; type: 'edit'; path: number[]; html: string }
  | { __mm: 'deck'; type: 'slide'; index: number };

/**
 * Ponte com o iframe do palco.
 *
 * O iframe contém o deck completo (todas as seções). A seleção e a edição de
 * texto acontecem lá dentro; o React apenas recebe eventos e envia comandos.
 */
export class IframeBridge {
  private readonly handler: (event: MessageEvent) => void;
  private ready = false;
  private pendingSelect: number[] | null = null;
  private readonly iframe: HTMLIFrameElement;
  private readonly events: BridgeEvents;

  constructor(iframe: HTMLIFrameElement, events: BridgeEvents) {
    this.iframe = iframe;
    this.events = events;
    this.handler = (event: MessageEvent) => {
      if (event.source !== this.iframe.contentWindow) return;
      const data = event.data as DeckMessage | undefined;
      if (!data || data.__mm !== 'deck') return;
      this.receive(data);
    };
    window.addEventListener('message', this.handler);
  }

  private receive(data: DeckMessage): void {
    switch (data.type) {
      case 'ready':
        this.ready = true;
        this.events.onReady?.(data.count);
        if (this.pendingSelect) {
          this.select(this.pendingSelect);
          this.pendingSelect = null;
        }
        break;
      case 'select':
        this.events.onSelect?.(
          data.path ? { path: data.path, tag: data.tag, label: data.label } : null
        );
        break;
      case 'edit':
        this.events.onEdit?.(data.path, data.html);
        break;
      case 'slide':
        this.events.onSlideChange?.(data.index);
        break;
      default:
        break;
    }
  }

  /** Envia um comando; se o iframe ainda não estiver pronto, ignora comandos visuais. */
  private send(message: Record<string, unknown>): void {
    const win = this.iframe.contentWindow;
    if (!win) return;
    win.postMessage({ __mm: 'editor', ...message }, '*');
  }

  /** Carrega um documento completo via `srcdoc`. */
  load(documentHTML: string): void {
    this.ready = false;
    this.iframe.srcdoc = documentHTML;
  }

  goto(index: number): void {
    this.send({ type: 'goto', index });
  }

  select(path: number[] | null): void {
    if (!this.ready) {
      if (path) this.pendingSelect = path;
      return;
    }
    this.send({ type: 'select', path });
  }

  /** Substitui o HTML de um slide já carregado, sem recarregar o iframe. */
  setSlideHTML(index: number, html: string): void {
    this.send({ type: 'set-slide', index, html });
  }

  /** Aplica atributos, estilos e classes no elemento selecionado. */
  patchElement(path: number[], patch: ElementPatch): void {
    this.send({
      type: 'patch-element',
      path,
      attrs: patch.attrs ?? {},
      style: patch.style ?? {},
      classes: patch.classes ?? {},
    });
  }

  /** Reinicia as animações do slide ativo. */
  previewAnimations(): void {
    this.send({ type: 'preview-anim' });
  }

  /** Encerra o preview e restaura o slide ativo. */
  stopPreview(): void {
    this.send({ type: 'stop-preview' });
  }

  /** Recalcula a escala do palco (após resize do painel). */
  fit(): void {
    this.send({ type: 'fit' });
  }

  destroy(): void {
    window.removeEventListener('message', this.handler);
  }
}
