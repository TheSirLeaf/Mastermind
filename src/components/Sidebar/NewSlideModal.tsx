// Tela flutuante "Novo slide": escolhe um modelo e um dos slides dele.
import { baseName } from '@packages/core/bases';
import { makeSlide } from '@packages/core/deck';
import { getModels, type ModelDef } from '@packages/core/models';
import type { Deck } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { Layers, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { newDeckFromModel } from '../../editor/actions';

import { SlidePreview } from './SlidePreview';

function previewDeck(model: ModelDef, html: string): Deck {
  return {
    title: model.name,
    slides: [makeSlide(html, '')],
    bases: model.bases(),
    modelId: model.id,
  };
}

export function NewSlideModal() {
  const open = useUIStore((state) => state.isNewSlideOpen);
  const close = useUIStore((state) => state.closeNewSlide);
  const addSlideFromModel = useDeckStore((state) => state.addSlideFromModel);
  const mode = useUIStore((state) => state.newSlideMode);
  const isDeck = mode === 'deck';
  const pick = (id: string, index: number | null) => {
    if (isDeck) newDeckFromModel(id, index);
    else if (index !== null) addSlideFromModel(id, index);
    close();
  };
  const currentModelId = useDeckStore((state) => state.deck.modelId);
  const models = useMemo(() => getModels(), []);
  const baseCounts = useMemo(() => new Map(models.map((m) => [m.id, m.bases().length])), [models]);
  const [modelId, setModelId] = useState(currentModelId ?? models[0]?.id ?? '');

  useEffect(() => {
    if (open && currentModelId) setModelId(currentModelId);
  }, [open, currentModelId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const model = models.find((m) => m.id === modelId) ?? models[0];
  // Os decks das miniaturas só mudam quando o modelo muda.
  const slideDecks = useMemo(
    () => (model ? model.slides.map((s) => previewDeck(model, s.html)) : []),
    [model]
  );
  const baseDecks = useMemo(
    () =>
      model
        ? model.bases().map((base) => ({
            name: baseName(base.html),
            deck: {
              title: model.name,
              slides: [
                makeSlide(
                  `<section class="slide dark" data-base="${/data-base-id="([^"]*)"/.exec(base.html)?.[1] ?? ''}"></section>`,
                  ''
                ),
              ],
              bases: [base],
              modelId: model.id,
            } satisfies Deck,
          }))
        : [],
    [model]
  );

  if (!open || !model) return null;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Novo slide"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex h-[min(680px,92vh)] w-[min(1040px,96vw)] overflow-hidden rounded-2xl border border-accent/30 bg-payday-surface shadow-2xl">
        <aside className="flex w-56 shrink-0 flex-col border-r border-payday-border bg-payday-bg/60">
          <div className="px-4 py-3 text-[10px] uppercase tracking-widest text-accent">Modelos</div>
          <div className="min-h-0 flex-1 space-y-1 overflow-auto px-2 pb-2">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={m.id === model.id}
                onClick={() => setModelId(m.id)}
                className={clsx(
                  'w-full rounded-lg border px-3 py-2 text-left transition',
                  m.id === model.id
                    ? 'border-accent/60 bg-accent/15 text-payday-text'
                    : 'border-transparent text-payday-textMuted hover:bg-white/5'
                )}
              >
                <span className="block text-sm font-medium">{m.name}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-payday-textDim">
                  {m.slides.length} slides · {baseCounts.get(m.id) ?? 0} base
                  {baseCounts.get(m.id) === 1 ? '' : 's'}
                </span>
                {m.id === currentModelId ? (
                  <span className="mt-1 inline-block rounded bg-accent/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent">
                    em uso
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-payday-border px-5 py-3">
            <div>
              <h2 className="text-base font-semibold text-payday-text">
                {isDeck ? 'Nova apresentação · ' : ''}
                {model.name}
              </h2>
              <p className="text-xs text-payday-textMuted">{model.description}</p>
            </div>
            {isDeck ? (
              <button
                type="button"
                onClick={() => pick(model.id, null)}
                className="ml-auto shrink-0 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:brightness-110"
              >
                Usar slides iniciais
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Fechar"
              onClick={close}
              className="rounded p-1 text-payday-textMuted transition hover:bg-white/10 hover:text-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-auto p-5">
            <h3 className="mb-2 text-[10px] uppercase tracking-widest text-accent">
              {isDeck
                ? 'Slides do modelo — clique para começar a apresentação com um deles'
                : 'Slides do modelo — clique para adicionar após o slide atual'}
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {model.slides.map((slide, index) => (
                <button
                  key={slide.name}
                  type="button"
                  onClick={() => pick(model.id, index)}
                  className="group overflow-hidden rounded-lg border border-payday-border bg-payday-bg text-left transition hover:border-accent/60"
                >
                  {slideDecks[index] ? (
                    <SlidePreview deck={slideDecks[index]} title={slide.name} />
                  ) : null}
                  <span className="block px-2 py-1.5 text-xs text-payday-textMuted group-hover:text-accent">
                    {slide.name}
                  </span>
                </button>
              ))}
            </div>

            <h3 className="mb-2 mt-6 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent">
              <Layers className="h-3 w-3" /> Slides base do modelo
            </h3>
            <p className="mb-2 text-[11px] text-payday-textDim">
              Definem o fundo dos slides. Vêm junto ao adicionar um slide que os usa.
            </p>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
              {baseDecks.map((entry) => (
                <div
                  key={entry.name}
                  className="overflow-hidden rounded-lg border border-payday-border bg-payday-bg"
                >
                  <SlidePreview deck={entry.deck} title={`Base ${entry.name}`} />
                  <span className="block px-2 py-1 text-[11px] text-payday-textMuted">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
