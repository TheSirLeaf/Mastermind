import { SLIDE_TEMPLATES, type SlideTemplateKind } from '@packages/core/deck';
import { useDeckStore } from '@store/deckStore';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const buttonClass =
  'flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:bg-payday-panel hover:text-accent disabled:pointer-events-none disabled:opacity-30';

export function SlideFooter() {
  const { addSlideFromTemplate, duplicateSlide, deleteSlide, moveSlide, currentIndex, deck } =
    useDeckStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const last = deck.slides.length - 1;

  return (
    <div ref={rootRef} className="relative grid grid-cols-5 gap-1 border-t border-white/10 p-2">
      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-2 z-30 mb-1 w-52 rounded-xl border border-accent/35 bg-payday-surface p-1.5 shadow-2xl"
        >
          {(Object.keys(SLIDE_TEMPLATES) as SlideTemplateKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-payday-text transition hover:bg-accent/15"
              onClick={() => {
                setMenuOpen(false);
                addSlideFromTemplate(kind);
              }}
            >
              {SLIDE_TEMPLATES[kind].name}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className={`${buttonClass} col-span-2`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <Plus className="h-3.5 w-3.5" /> Novo
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Duplicar slide"
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
        disabled={currentIndex <= 0}
        onClick={() => moveSlide(currentIndex, currentIndex - 1)}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Mover para baixo"
        aria-label="Mover slide para baixo"
        disabled={currentIndex >= last}
        onClick={() => moveSlide(currentIndex, currentIndex + 1)}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={`${buttonClass} col-span-5`}
        disabled={deck.slides.length <= 1}
        onClick={() => deleteSlide(currentIndex)}
      >
        <Trash2 className="h-3.5 w-3.5" /> Excluir slide
      </button>
    </div>
  );
}
