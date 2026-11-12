import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';

const buttonClass =
  'flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:bg-payday-panel hover:text-accent disabled:pointer-events-none disabled:opacity-30';

export function SlideFooter() {
  const { duplicateSlide, deleteSlide, moveSlide, currentIndex, deck } = useDeckStore();
  const openNewSlide = useUIStore((state) => state.openNewSlide);
  const slideCount = deck.slides.length;
  const isBase = currentIndex >= slideCount;
  const last = slideCount - 1;

  return (
    <div className="grid grid-cols-5 gap-1 border-t border-white/10 p-2">
      <button
        type="button"
        className={`${buttonClass} col-span-2`}
        aria-haspopup="dialog"
        onClick={() => openNewSlide()}
      >
        <Plus className="h-3.5 w-3.5" /> Novo
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Duplicar (Ctrl+C, Ctrl+V)"
        aria-label="Duplicar slide"
        onClick={() => duplicateSlide(currentIndex)}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Mover para cima"
        aria-label="Mover slide para cima"
        disabled={isBase || currentIndex <= 0}
        onClick={() => moveSlide(currentIndex, currentIndex - 1)}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Mover para baixo"
        aria-label="Mover slide para baixo"
        disabled={isBase || currentIndex >= last}
        onClick={() => moveSlide(currentIndex, currentIndex + 1)}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={`${buttonClass} col-span-5`}
        disabled={isBase ? false : slideCount <= 1}
        onClick={() => deleteSlide(currentIndex)}
      >
        <Trash2 className="h-3.5 w-3.5" /> {isBase ? 'Excluir base' : 'Excluir slide'}
      </button>
    </div>
  );
}
