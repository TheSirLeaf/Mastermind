import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';

import { saveHTML } from './actions';
import { getActiveBridge } from './bridgeRef';

/** Ações vindas de teclas dentro do iframe do palco. */
export function handleBridgeKey(key: string): void {
  const deck = useDeckStore.getState();
  switch (key) {
    case 'undo':
      deck.undo();
      break;
    case 'redo':
      deck.redo();
      break;
    case 'save':
      void saveHTML();
      break;
    case 'next':
      deck.selectSlide(deck.currentIndex + 1);
      break;
    case 'prev':
      deck.selectSlide(deck.currentIndex - 1);
      break;
    case 'open-package':
      useUIStore.getState().setInspectorTab('package');
      break;
    default:
      break;
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/**
 * Atalhos globais para quando o foco está fora do palco (painéis, cabeçalho).
 * Dentro do iframe, o próprio motor de edição cuida das teclas.
 */
export function handleGlobalKey(event: KeyboardEvent): void {
  const ctrl = event.ctrlKey || event.metaKey;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const typing = isTypingTarget(event.target);
  const ui = useUIStore.getState();

  if (ctrl && key === 's') {
    event.preventDefault();
    void saveHTML();
    return;
  }
  if (key === 'F5') {
    event.preventDefault();
    ui.setPreviewMode(false);
    ui.setPresenting(true);
    return;
  }
  if (typing || ui.isPresenting || ui.isPreviewMode || ui.isPackageManagerOpen) return;

  const deck = useDeckStore.getState();
  const bridge = getActiveBridge();

  if (ctrl && key === 'z') {
    event.preventDefault();
    if (event.shiftKey) deck.redo();
    else deck.undo();
    return;
  }
  if (ctrl && key === 'y') {
    event.preventDefault();
    deck.redo();
    return;
  }
  if (!bridge) return;
  if (ctrl && key === 'd' && deck.selection) {
    event.preventDefault();
    bridge.command('duplicate');
    return;
  }
  if ((key === 'Delete' || key === 'Backspace') && deck.selection) {
    event.preventDefault();
    bridge.command('delete');
    return;
  }
  if (key === 'Enter' && deck.selection) {
    event.preventDefault();
    bridge.command('edit');
    return;
  }
  if (key === 'PageDown') {
    event.preventDefault();
    deck.selectSlide(deck.currentIndex + 1);
    return;
  }
  if (key === 'PageUp') {
    event.preventDefault();
    deck.selectSlide(deck.currentIndex - 1);
    return;
  }
  if (key.startsWith('Arrow')) {
    event.preventDefault();
    if (deck.selection) {
      const step = event.shiftKey ? 10 : 1;
      const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
      const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;
      bridge.command('nudge', { dx, dy });
    } else {
      deck.selectSlide(deck.currentIndex + (key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1));
    }
  }
}
