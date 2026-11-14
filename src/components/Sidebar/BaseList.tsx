// Lista de slides base (fundos) abaixo da lista de slides.
import { baseName, baseOwnId, slidesUsingBase } from '@packages/core/bases';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { PointerEvent } from 'react';

import { baseListMenu } from '../../editor/contextMenus';

export function BaseList() {
  const deck = useDeckStore((state) => state.deck);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const selectSlide = useDeckStore((state) => state.selectSlide);
  const duplicateSlide = useDeckStore((state) => state.duplicateSlide);
  const deleteSlide = useDeckStore((state) => state.deleteSlide);
  const addBase = useDeckStore((state) => state.addBase);
  const bases = deck.bases ?? [];
  const offset = deck.slides.length;
  const height = useUIStore((state) => state.basesPanelHeight);

  // Arrastar a borda de cima muda a altura da lista (ela rola por dentro).
  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startH = height;
    const max = Math.max(120, window.innerHeight * 0.6);
    const onMove = (e: globalThis.PointerEvent) => {
      useUIStore.getState().setBasesPanelHeight(Math.min(max, startH + (startY - e.clientY)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'row-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      data-testid="bases-panel"
      className="relative flex shrink-0 flex-col border-t border-white/10 px-2 pb-2 pt-1.5"
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Redimensionar a lista de slides base"
        title="Arraste para mudar a altura"
        onPointerDown={startResize}
        className="absolute inset-x-0 -top-1 h-2 cursor-row-resize hover:bg-accent/30"
      />
      <div className="flex items-center justify-between px-1 py-1 text-[10px] uppercase tracking-[0.2em] text-payday-textDim">
        <span>Slides base ({bases.length})</span>
        <button
          type="button"
          title="Novo slide base"
          aria-label="Novo slide base"
          onClick={() => addBase('dark')}
          className="rounded p-0.5 text-payday-textMuted transition hover:bg-white/10 hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto" data-testid="bases-list">
        {bases.map((base, k) => {
          const id = baseOwnId(base.html) ?? '';
          const uses = slidesUsingBase(deck, id).length;
          const active = currentIndex === offset + k;
          return (
            <div
              key={base.id}
              role="button"
              tabIndex={0}
              onClick={() => selectSlide(offset + k)}
              onContextMenu={(event) => {
                event.preventDefault();
                selectSlide(offset + k);
                useUIStore
                  .getState()
                  .openContextMenu(event.clientX, event.clientY, baseListMenu(offset + k));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') selectSlide(offset + k);
              }}
              className={clsx(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition',
                active
                  ? 'bg-sky-500/15 text-payday-text ring-1 ring-sky-400/50'
                  : 'text-payday-textMuted hover:bg-white/5'
              )}
            >
              <span className="flex-1 truncate">{baseName(base.html)}</span>
              <span className="text-[10px] text-payday-textDim">
                {uses} uso{uses === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                title="Duplicar base"
                aria-label="Duplicar base"
                onClick={(event) => {
                  event.stopPropagation();
                  duplicateSlide(offset + k);
                }}
                className="rounded p-0.5 transition hover:text-accent"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Excluir base"
                aria-label="Excluir base"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteSlide(offset + k);
                }}
                className="rounded p-0.5 transition hover:text-accent disabled:opacity-30"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        {bases.length === 0 ? (
          <p className="px-1 text-[11px] text-payday-textDim">
            Este deck não usa slides base. Crie um com +.
          </p>
        ) : null}
      </div>
    </div>
  );
}
