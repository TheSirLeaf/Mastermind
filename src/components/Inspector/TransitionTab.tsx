import { FormGenerator } from '@components/Inspector/forms/FormGenerator';
import {
  SLIDE_TRANSITIONS,
  slideTransition,
  slideTransitionSpec,
  type SlideTransition,
} from '@packages/core/deck';
import { registry } from '@packages/core/PackageRegistry';
import { itemAt, useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from './EmptyState';

const TRANSITIONS: Record<
  (typeof SLIDE_TRANSITIONS)[number],
  { label: string; description: string }
> = {
  default: { label: 'Padrão', description: 'Um slide some e o outro aparece, rápido.' },
  instant: { label: 'Instantâneo', description: 'O slide some e o próximo aparece, sem animação.' },
  move: {
    label: 'Mover',
    description: 'A câmera viaja até o slide, com zoom conforme a posição na aba Slides.',
  },
  slide: { label: 'Deslizar', description: 'O novo slide empurra o anterior para o lado.' },
  zoom: { label: 'Zoom', description: 'O anterior se afasta e o novo se aproxima.' },
  morph: {
    label: 'Interpolar',
    description:
      'Elementos iguais nos dois slides (mesmo texto, imagem ou forma) viajam de um lugar ao outro. Para ligar elementos diferentes, dê o mesmo nome a eles com o lápis do inspetor.',
  },
};

const choiceClass = (active: boolean) =>
  clsx(
    'rounded-md border px-2 py-1.5 text-left transition',
    active
      ? 'border-accent/60 bg-accent/15 text-accent'
      : 'border-payday-border text-payday-textMuted hover:bg-white/5'
  );

/** Como o slide atual entra na apresentação: transições embutidas e as dos pacotes. */
export function TransitionTab() {
  const index = useDeckStore((state) => state.currentIndex);
  const slide = useDeckStore((state) => itemAt(state.deck, state.currentIndex));
  const isBase = useDeckStore((state) => state.currentIndex >= state.deck.slides.length);
  const setSlideTransition = useDeckStore((state) => state.setSlideTransition);
  const setSlideTransitionSpec = useDeckStore((state) => state.setSlideTransitionSpec);
  const replay = useUIStore((state) => state.replayAnimations);
  // "Padrões" recria o formulário (ele só lê os valores ao montar).
  const [resets, setResets] = useState(0);

  if (!slide) return null;
  if (isBase) {
    return (
      <EmptyState
        message="Slides base não entram na apresentação, então não têm transição."
        icon="layout"
      />
    );
  }

  const transition: SlideTransition = slideTransition(slide.html);
  const pkgTransitions = registry.listTransitions();
  const pkg = transition.startsWith('pkg:') ? registry.getTransition(transition) : null;
  const missing = transition.startsWith('pkg:') && !pkg;
  const description = transition.startsWith('pkg:')
    ? (pkg?.transition.description ??
      'Transição de um pacote que não está instalado; a apresentação usa a padrão.')
    : TRANSITIONS[transition as (typeof SLIDE_TRANSITIONS)[number]].description;
  const form = pkg?.transition.form ?? [];
  const spec = { ...(pkg?.transition.defaults ?? {}), ...slideTransitionSpec(slide.html) };
  const edited = Object.keys(slideTransitionSpec(slide.html)).length > 0;

  return (
    <div className="space-y-5 p-4">
      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-accent">Transição</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {SLIDE_TRANSITIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={transition === value}
              onClick={() => setSlideTransition(index, value)}
              className={choiceClass(transition === value)}
            >
              <span className="block text-xs font-medium">{TRANSITIONS[value].label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-accent">De pacotes</h3>
        {pkgTransitions.length === 0 && !missing ? (
          <p className="text-[11px] leading-snug text-payday-textDim">
            Nenhum pacote instalado oferece transições.
          </p>
        ) : (
          <div className="space-y-1.5">
            {pkgTransitions.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={transition === t.value}
                onClick={() => setSlideTransition(index, t.value)}
                className={clsx(choiceClass(transition === t.value), 'w-full')}
              >
                <span className="block text-xs font-medium">{t.label}</span>
                <span className="block text-[10px] text-payday-textDim">
                  {t.description.split(' — ')[0]}
                </span>
              </button>
            ))}
            {missing ? (
              <div className={clsx(choiceClass(true), 'w-full')}>
                <span className="block text-xs font-medium">{transition}</span>
                <span className="block text-[10px] text-payday-textDim">Pacote ausente</span>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <p className="text-[11px] leading-snug text-payday-textDim">
        {description} Vale para a entrada deste slide.
      </p>

      <button
        type="button"
        onClick={replay}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-payday-border px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
      >
        <Play className="h-3 w-3" /> Visualizar a entrada do slide
      </button>

      {pkg && form.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-accent">
              Ajustes · {pkg.transition.name}
            </h3>
            <button
              type="button"
              disabled={!edited}
              onClick={() => {
                setSlideTransitionSpec(index, null);
                setResets((n) => n + 1);
              }}
              title="Voltar aos valores padrão do pacote"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-payday-textMuted transition hover:text-accent disabled:opacity-35"
            >
              <RotateCcw className="h-3 w-3" /> Padrões
            </button>
          </div>
          <FormGenerator
            key={`${slide.id}:${transition}:${resets}`}
            schema={form}
            spec={spec}
            onChange={(next) => setSlideTransitionSpec(index, next)}
          />
        </section>
      ) : null}
    </div>
  );
}
