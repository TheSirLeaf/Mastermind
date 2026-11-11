// components/Sidebar/SlideList.tsx
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDeckStore } from '@store/deckStore';

import { SlideItem } from './SlideItem';

export function SlideList() {
  const { deck, currentIndex, moveSlide, selectSlide, duplicateSlide, deleteSlide } =
    useDeckStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = deck.slides.findIndex((s) => s.id === active.id);
      const newIndex = deck.slides.findIndex((s) => s.id === over?.id);
      moveSlide(oldIndex, newIndex);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={deck.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {deck.slides.map((slide, index) => (
            <SlideItem
              key={slide.id}
              slide={slide}
              index={index}
              isActive={index === currentIndex}
              onSelect={() => selectSlide(index)}
              onDuplicate={() => duplicateSlide(index)}
              onDelete={() => deleteSlide(index)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
