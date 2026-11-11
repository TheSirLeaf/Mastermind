// components/Sidebar/SlideItem.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Slide } from '@packages/core/types';
import { clsx } from 'clsx';
import { Copy, Trash2 } from 'lucide-react';

interface SlideItemProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SlideItem({
  slide,
  index,
  isActive,
  onSelect,
  onDuplicate,
  onDelete,
}: SlideItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getSlideTitle = (slideHtml: string): string => {
    const doc = new DOMParser().parseFromString(slideHtml, 'text/html');
    const el = doc.querySelector('.display, .title, h1, h2');
    if (el) {
      el.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text) return text;
    }
    const eyebrow = doc.querySelector('.eyebrow')?.textContent?.replace(/\s+/g, ' ').trim();
    return eyebrow || 'Slide sem título';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition',
        isActive ? 'bg-gold-DEFAULT/15 text-payday-text' : 'text-payday-textMuted'
      )}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <span className="mt-0.5 w-5 shrink-0 text-[10px] tabular-nums text-payday-textDim/50">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="line-clamp-2 text-xs leading-snug flex-1">{getSlideTitle(slide.html)}</span>
      <div className="flex items-center gap-1 opacity-100">
        <button
          className="rounded p-1 text-payday-textMuted transition"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicar"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          className="rounded p-1 text-payday-textMuted transition"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
