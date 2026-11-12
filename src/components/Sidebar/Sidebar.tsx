// components/Sidebar/Sidebar.tsx
import { useDeckStore } from '@store/deckStore';
import { Layers } from 'lucide-react';

import { BaseList } from './BaseList';
import { SlideFooter } from './SlideFooter';
import { SlideList } from './SlideList';

export function Sidebar() {
  const { deck } = useDeckStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-payday-textDim">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Slides ({deck.slides.length})
        </span>
      </div>

      <div id="list" className="flex-1 overflow-y-auto p-2">
        <SlideList />
      </div>

      <BaseList />
      <SlideFooter />
    </div>
  );
}
