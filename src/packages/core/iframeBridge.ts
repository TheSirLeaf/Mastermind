import type { ElementPatch } from './animation';
import type { SelectionInfo } from './types';

export interface BridgeEvents {
  onReady?: (slideCount: number) => void;
  onSelect?: (selection: SelectionInfo | null) => void;
  onEdit?: (path: number[], html: string) => void;
  onSlideChange?: (index: number) => void;
  /** O iframe alterou um slide (mover, redimensionar, digitar…): HTML já limpo. */
  onSlideHTML?: (index: number, html: string, key: string) => void;
  /** Atalho/ação disparada dentro do iframe (undo, redo, save, next, prev…). */
  onKey?: (key: string) => void;
  /** Arquivo solto sobre o palco (imagem, .html ou pacote .json). */
  onDropFile?: (file: File) => void;
}

/** Comandos executados pelo iframe sobre o elemento selecionado. */
export const BRIDGE_COMMANDS = [
  'delete',
  'duplicate',
  'front',
  'back',
  'reset',
  'parent',
  'edit',
  'nudge',
  'format',
] as const;

export type BridgeCommand = (typeof BRIDGE_COMMANDS)[number];

type DeckMessage =
  | { __mm: 'deck'; type: 'ready'; count: number }
  | { __mm: 'deck'; type: 'select'; path: number[] | null; tag: string; label: string }
  | { __mm: 'deck'; type: 'edit'; path: number[]; html: string }
  | { __mm: 'deck'; type: 'slide'; index: number }
  | { __mm: 'deck'; type: 'slide-html'; index: number; html: string; key?: string }
  | { __mm: 'deck'; type: 'key'; key: string }
  | { __mm: 'deck'; type: 'drop'; file: File };

/**
 * Ponte com o iframe do palco.
 *
 * O iframe contém o deck completo (todas as seções). A seleção e a edição de
 * texto acontecem lá dentro; o React apenas recebe eventos e envia comandos.
 */
export class IframeBridge {
  private readonly handler: (event: MessageEvent) => void;
  private ready = false;
  private pendingGoto: number | null = null;
  private pendingSelect: { path: number[]; edit: boolean } | null = null;
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
        if (this.pendingGoto !== null) {
          const index = this.pendingGoto;
          this.pendingGoto = null;
          this.send({ type: 'goto', index });
        }
        if (this.pendingSelect) {
          const { path, edit } = this.pendingSelect;
          this.pendingSelect = null;
          this.sendSelect(path, edit);
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
      case 'slide-html':
        this.events.onSlideHTML?.(data.index, data.html, data.key ?? '');
        break;
      case 'key':
        this.events.onKey?.(data.key);
        break;
      case 'drop':
        this.events.onDropFile?.(data.file);
        break;
      default:
        break;
    }
  }

  /** Envia um comando; se o iframe ainda não estiver pronto, ignora comandos visuais. */
  private sendSelect(path: number[] | null, edit: boolean): void {
    const message: Record<string, unknown> = { type: 'select', path };
    if (edit) message.edit = true;
    this.send(message);
  }

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
    if (!this.ready) {
      this.pendingGoto = index;
      return;
    }
    this.send({ type: 'goto', index });
  }

  select(path: number[] | null, edit = false): void {
    if (!this.ready) {
      if (path) this.pendingSelect = { path, edit };
      return;
    }
    this.sendSelect(path, edit);
  }

  /** Executa uma ação sobre o elemento selecionado (excluir, duplicar, z-order…). */
  command(name: BridgeCommand, arg?: Record<string, unknown>): void {
    this.send({ type: 'cmd', name, arg });
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
