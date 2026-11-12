// Lista de slides base (fundos) abaixo da lista de slides.
import { baseName, baseOwnId, slidesUsingBase } from '@packages/core/bases';
import { useDeckStore } from '@store/deckStore';
import { clsx } from 'clsx';
import { Copy, Plus, Trash2 } from 'lucide-react';

export function BaseList() {
  const deck = useDeckStore((state) => state.deck);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const selectSlide = useDeckStore((state) => state.selectSlide);
  const duplicateSlide = useDeckStore((state) => state.duplicateSlide);
  const deleteSlide = useDeckStore((state) => state.deleteSlide);
  const addBase = useDeckStore((state) => state.addBase);
  const bases = deck.bases ?? [];
  const offset = deck.slides.length;

  return (
    <div className="border-t border-white/10 px-2 pb-2 pt-1.5">
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
      <div className="space-y-1">
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
