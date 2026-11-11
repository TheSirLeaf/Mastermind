// components/Sidebar/SlideFooter.tsx
import { useDeckStore } from '@store/deckStore';
import { Plus, Trash2 } from 'lucide-react';

export function SlideFooter() {
  const { addSlide, deleteSlide, currentIndex, deck } = useDeckStore();

  return (
    <div className="grid grid-cols-2 gap-1 border-t border-white/10 p-2">
      <button
        type="button"
        className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] text-[#F3E6E2]/60 hover:bg-white/5"
        onClick={() => addSlide()}
      >
        <Plus className="w-3.5 h-3.5" /> Novo
      </button>
      <button
        type="button"
        className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] text-[#F3E6E2]/60 hover:bg-white/5 disabled:opacity-30"
        disabled={deck.slides.length <= 1}
        onClick={() => deleteSlide(currentIndex)}
      >
        <Trash2 className="w-3.5 h-3.5" /> Excluir
      </button>
    </div>
  );
}
