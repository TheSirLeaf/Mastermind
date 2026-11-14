// editor/contextMenus.ts
// Itens dos menus de contexto (palco, lista de slides e lista de bases).
import type { StageContext } from '@packages/core/iframeBridge';
import { useDeckStore } from '@store/deckStore';
import { useUIStore, type ContextMenuItem } from '@stores/uiStore';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Crosshair,
  Focus,
  Lock,
  LockOpen,
  Maximize,
  Pencil,
  Play,
  Plus,
  Trash2,
  Unlink,
  Link2,
  Maximize2,
  Settings2,
} from 'lucide-react';

import { alignToSlide, moveLayer, pickParent, releaseFromParent, toggleLock } from './arrange';
import { getActiveBridge } from './bridgeRef';
import { getStageViewHandlers } from './stageView';

type Item = ContextMenuItem | 'separator';

const hasClip = (kind: 'element' | 'slide'): boolean => window.__mmClip?.kind === kind;

/** Botão direito sobre um elemento do slide atual. */
export function elementMenu(ctx: StageContext): Item[] {
  const bridge = getActiveBridge();
  const selection = useDeckStore.getState().selection;
  const ui = useUIStore.getState();
  const items: Item[] = [];
  if (ctx.text) {
    items.push({
      label: 'Editar texto',
      icon: Pencil,
      shortcut: 'Enter',
      onSelect: () => bridge?.command('edit'),
    });
    items.push('separator');
  }
  items.push(
    { label: 'Copiar', icon: Copy, shortcut: 'Ctrl+C', onSelect: () => bridge?.command('copy') },
    {
      label: 'Colar',
      icon: ClipboardPaste,
      shortcut: 'Ctrl+V',
      disabled: !hasClip('element'),
      onSelect: () => bridge?.command('paste'),
    },
    {
      label: 'Duplicar',
      icon: CopyPlus,
      shortcut: 'Ctrl+D',
      onSelect: () => bridge?.command('duplicate'),
    },
    'separator',
    {
      label: 'Trazer para frente',
      icon: ArrowUp,
      shortcut: 'Ctrl+]',
      onSelect: () => moveLayer('forward'),
    },
    {
      label: 'Trazer ao topo',
      icon: ArrowUpToLine,
      shortcut: 'Ctrl+Shift+]',
      onSelect: () => moveLayer('front'),
    },
    {
      label: 'Enviar para trás',
      icon: ArrowDown,
      shortcut: 'Ctrl+[',
      onSelect: () => moveLayer('backward'),
    },
    {
      label: 'Enviar ao fundo',
      icon: ArrowDownToLine,
      shortcut: 'Ctrl+Shift+[',
      onSelect: () => moveLayer('back'),
    },
    'separator',
    {
      label: 'Centralizar no slide',
      icon: Focus,
      onSelect: () => alignToSlide('center', 'middle'),
    },
    {
      label: 'Centralizar na horizontal',
      icon: AlignCenterVertical,
      onSelect: () => alignToSlide('center', null),
    },
    {
      label: 'Centralizar na vertical',
      icon: AlignCenterHorizontal,
      onSelect: () => alignToSlide(null, 'middle'),
    },
    'separator',
    { label: 'Definir pai…', icon: Link2, onSelect: () => pickParent() },
    {
      label: 'Soltar do pai',
      icon: Unlink,
      disabled: !ctx.nested,
      onSelect: () => releaseFromParent(),
    },
    {
      label: ctx.locked ? 'Destravar' : 'Travar',
      icon: ctx.locked ? LockOpen : Lock,
      onSelect: () => toggleLock(selection),
    },
    {
      label: 'Animar…',
      icon: Play,
      onSelect: () => {
        ui.setWorkspace('animation');
        ui.setInspectorTab('animation');
      },
    },
    'separator',
    {
      label: 'Excluir',
      icon: Trash2,
      shortcut: 'Del',
      danger: true,
      onSelect: () => bridge?.command('delete'),
    }
  );
  return items;
}

/** Botão direito sobre um slide (fundo do slide, ou outro slide do espaço). */
export function slideMenu(index: number): Item[] {
  const deck = useDeckStore.getState();
  const ui = useUIStore.getState();
  const isBase = index >= deck.deck.slides.length;
  const bridge = getActiveBridge();
  return [
    {
      label: 'Colar elemento',
      icon: ClipboardPaste,
      shortcut: 'Ctrl+V',
      disabled: !hasClip('element'),
      onSelect: () => bridge?.command('paste'),
    },
    {
      label: 'Colar slide depois',
      icon: ClipboardPaste,
      disabled: !hasClip('slide'),
      onSelect: () => {
        deck.selectSlide(index);
        deck.pasteSlide();
      },
    },
    'separator',
    { label: 'Novo slide…', icon: Plus, onSelect: () => ui.openNewSlide() },
    {
      label: isBase ? 'Duplicar base' : 'Duplicar slide',
      icon: CopyPlus,
      onSelect: () => deck.duplicateSlide(index),
    },
    {
      label: isBase ? 'Copiar base' : 'Copiar slide',
      icon: Copy,
      onSelect: () => deck.copySlide(index),
    },
    {
      label: 'Transição, posição e fundo…',
      icon: Settings2,
      onSelect: () => {
        deck.selectSlide(index);
        ui.setWorkspace('slide');
      },
    },
    {
      label: 'Enquadrar este slide',
      icon: Maximize2,
      onSelect: () => getStageViewHandlers()?.frame?.(index),
    },
    'separator',
    {
      label: isBase ? 'Excluir base' : 'Excluir slide',
      icon: Trash2,
      danger: true,
      disabled: !isBase && deck.deck.slides.length <= 1,
      onSelect: () => deck.deleteSlide(index),
    },
  ];
}

/** Botão direito no espaço vazio (fora dos slides). */
export function canvasMenu(): Item[] {
  const ui = useUIStore.getState();
  const current = useDeckStore.getState().currentIndex;
  return [
    {
      label: 'Ver todos os slides',
      icon: Maximize,
      onSelect: () => getStageViewHandlers()?.frame?.(null),
    },
    {
      label: 'Ir para o slide atual',
      icon: Crosshair,
      onSelect: () => getStageViewHandlers()?.frame?.(current),
    },
    'separator',
    { label: 'Novo slide…', icon: Plus, onSelect: () => ui.openNewSlide() },
    {
      label: 'Colar slide',
      icon: ClipboardPaste,
      disabled: !hasClip('slide'),
      onSelect: () => useDeckStore.getState().pasteSlide(),
    },
  ];
}

/** Botão direito num slide da lista da esquerda. */
export function slideListMenu(index: number): Item[] {
  const deck = useDeckStore.getState();
  const last = deck.deck.slides.length - 1;
  return [
    {
      label: 'Novo slide depois…',
      icon: Plus,
      onSelect: () => {
        deck.selectSlide(index);
        useUIStore.getState().openNewSlide();
      },
    },
    { label: 'Duplicar', icon: CopyPlus, onSelect: () => deck.duplicateSlide(index) },
    { label: 'Copiar', icon: Copy, shortcut: 'Ctrl+C', onSelect: () => deck.copySlide(index) },
    {
      label: 'Colar depois',
      icon: ClipboardPaste,
      shortcut: 'Ctrl+V',
      disabled: !hasClip('slide'),
      onSelect: () => {
        deck.selectSlide(index);
        deck.pasteSlide();
      },
    },
    'separator',
    {
      label: 'Mover para cima',
      icon: ArrowUp,
      disabled: index <= 0,
      onSelect: () => deck.moveSlide(index, index - 1),
    },
    {
      label: 'Mover para baixo',
      icon: ArrowDown,
      disabled: index >= last,
      onSelect: () => deck.moveSlide(index, index + 1),
    },
    'separator',
    {
      label: 'Excluir',
      icon: Trash2,
      danger: true,
      disabled: deck.deck.slides.length <= 1,
      onSelect: () => deck.deleteSlide(index),
    },
  ];
}

/** Botão direito numa base da lista da esquerda (índice na lista unificada). */
export function baseListMenu(index: number): Item[] {
  const deck = useDeckStore.getState();
  return [
    { label: 'Editar a base', icon: Pencil, onSelect: () => deck.selectSlide(index) },
    { label: 'Duplicar', icon: CopyPlus, onSelect: () => deck.duplicateSlide(index) },
    { label: 'Copiar', icon: Copy, onSelect: () => deck.copySlide(index) },
    'separator',
    { label: 'Excluir', icon: Trash2, danger: true, onSelect: () => deck.deleteSlide(index) },
  ];
}
