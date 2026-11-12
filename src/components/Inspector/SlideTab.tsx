import {
  defaultSlideLayout,
  SLIDE_TRANSITIONS,
  slideBackground,
  slideLayout,
  slideNotes,
  slideTheme,
  slideTransition,
  type SlideTransition,
} from '@packages/core/deck';
import { registry } from '@packages/core/PackageRegistry';
import { useDeckStore } from '@store/deckStore';
import { Moon, Sun } from 'lucide-react';

const BACKGROUNDS: Array<[string, string]> = [
  ['Vinho', 'linear-gradient(150deg,#411725 0%,#2A0E1A 52%,#1B0810 100%)'],
  ['Rosé', 'linear-gradient(150deg,#8E3B52,#4A1B2C)'],
  ['Creme', 'linear-gradient(155deg,#FFF8F5,#F6E4E0)'],
  ['Dourado', 'linear-gradient(150deg,#F7D98B,#D6A84F)'],
  ['Preto', '#10060B'],
  ['Branco', '#FFFFFF'],
];

const TRANSITIONS: Record<
  (typeof SLIDE_TRANSITIONS)[number],
  { label: string; description: string }
> = {
  default: { label: 'Padrão', description: 'Um slide some e o outro aparece, rápido.' },
  instant: { label: 'Instantâneo', description: 'O slide some e o próximo aparece, sem animação.' },
  move: {
    label: 'Mover',
    description: 'A câmera viaja até o slide, com zoom conforme a posição na aba Slide.',
  },
  slide: { label: 'Deslizar', description: 'O novo slide empurra o anterior para o lado.' },
  zoom: { label: 'Zoom', description: 'O anterior se afasta e o novo se aproxima.' },
};

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-accent/40';

/** Tema, fundo e notas do apresentador do slide atual. */
export function SlideTab() {
  const index = useDeckStore((state) => state.currentIndex);
  const slide = useDeckStore((state) => state.deck.slides[state.currentIndex]);
  const setSlideTheme = useDeckStore((state) => state.setSlideTheme);
  const setSlideBackground = useDeckStore((state) => state.setSlideBackground);
  const updateSlideNotes = useDeckStore((state) => state.updateSlideNotes);
  const setSlideLayout = useDeckStore((state) => state.setSlideLayout);
  const setSlideTransition = useDeckStore((state) => state.setSlideTransition);

  if (!slide) return null;
  const theme = slideTheme(slide.html);
  const background = slideBackground(slide.html);
  const layout = slideLayout(slide.html, index);
  const transition: SlideTransition = slideTransition(slide.html);
  const pkgTransitions = registry.listTransitions();
  const pkgCurrent = pkgTransitions.find((t) => t.value === transition);
  const isPkg = transition.startsWith('pkg:');
  const info = isPkg
    ? {
        label: pkgCurrent?.label ?? 'Pacote',
        description:
          pkgCurrent?.description ?? 'Transição de um pacote que não está instalado; usa a padrão.',
      }
    : TRANSITIONS[transition as (typeof SLIDE_TRANSITIONS)[number]];
  const home = defaultSlideLayout(index);
  const solid = /^#[0-9a-f]{6}$/i.test(background) ? background : '#2a0e1a';

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
              className={`rounded-md border px-2 py-1.5 text-left transition ${
                transition === value
                  ? 'border-accent/60 bg-accent/15 text-accent'
                  : 'border-payday-border text-payday-textMuted hover:bg-white/5'
              }`}
            >
              <span className="block text-xs font-medium">{TRANSITIONS[value].label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={isPkg}
          disabled={pkgTransitions.length === 0}
          onClick={() => {
            const first = pkgTransitions[0];
            if (first && !isPkg) setSlideTransition(index, first.value);
          }}
          className={`mt-1.5 w-full rounded-md border px-2 py-1.5 text-left text-xs font-medium transition disabled:opacity-40 ${
            isPkg
              ? 'border-accent/60 bg-accent/15 text-accent'
              : 'border-payday-border text-payday-textMuted hover:bg-white/5'
          }`}
        >
          Pacote
          {pkgTransitions.length === 0 ? (
            <span className="ml-1 font-normal text-payday-textDim">
              (nenhum pacote com transições)
            </span>
          ) : null}
        </button>
        {isPkg ? (
          <select
            aria-label="Transição do pacote"
            value={transition}
            onChange={(event) => setSlideTransition(index, event.target.value as SlideTransition)}
            className={`${inputClass} mt-1.5`}
          >
            {pkgCurrent ? null : <option value={transition}>{transition}</option>}
            {pkgTransitions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.description.split(' — ')[0]}
              </option>
            ))}
          </select>
        ) : null}
        <p className="mt-1.5 text-[11px] leading-snug text-payday-textDim">
          {info.description} Vale para a entrada deste slide.
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-accent">
          Posição e tamanho
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-payday-textDim/60">X</span>
            <input
              type="number"
              aria-label="Posição X do slide"
              className={inputClass}
              value={Math.round(layout.x)}
              onChange={(event) => setSlideLayout(index, { x: Number(event.target.value) || 0 })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-payday-textDim/60">Y</span>
            <input
              type="number"
              aria-label="Posição Y do slide"
              className={inputClass}
              value={Math.round(layout.y)}
              onChange={(event) => setSlideLayout(index, { y: Number(event.target.value) || 0 })}
            />
          </label>
        </div>
        <label className="mt-2 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-payday-textDim/60">
            Tamanho · {Math.round(layout.s * 100)}%
          </span>
          <input
            type="range"
            min={5}
            max={300}
            step={1}
            aria-label="Tamanho do slide"
            className="accent-accent"
            value={Math.round(layout.s * 100)}
            onChange={(event) => setSlideLayout(index, { s: Number(event.target.value) / 100 })}
          />
        </label>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            disabled={layout.s === 1}
            onClick={() => setSlideLayout(index, { s: 1 })}
            className="flex-1 rounded border border-payday-border px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:border-accent/50 hover:text-accent disabled:opacity-35"
          >
            Resetar tamanho
          </button>
          <button
            type="button"
            disabled={layout.x === home.x && layout.y === home.y}
            onClick={() => setSlideLayout(index, { x: home.x, y: home.y })}
            className="flex-1 rounded border border-payday-border px-2 py-1.5 text-[11px] text-payday-textMuted transition hover:border-accent/50 hover:text-accent disabled:opacity-35"
          >
            Resetar posição
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-payday-textDim">
          Arraste o slide no espaço para mover e a alça do canto para redimensionar (mantém a
          proporção). Coloque um slide pequeno sobre outro para criar um slide dentro do outro.
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-accent">Tema</h3>
        <div className="flex gap-1 rounded-lg border border-payday-border bg-payday-bg p-0.5">
          {(
            [
              ['dark', 'Escuro', Moon],
              ['light', 'Claro', Sun],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setSlideTheme(index, value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition ${
                theme === value
                  ? 'bg-accent/20 text-accent'
                  : 'text-payday-textMuted hover:bg-white/5'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-accent">Fundo</h3>
        <div className="flex flex-wrap gap-1.5">
          {BACKGROUNDS.map(([name, css]) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={`Fundo ${name}`}
              onClick={() => setSlideBackground(index, css)}
              className="h-7 w-9 rounded-md border border-white/15 transition hover:border-accent"
              style={{ background: css }}
            />
          ))}
          <button
            type="button"
            title="Fundo original do tema"
            aria-label="Restaurar fundo do tema"
            onClick={() => setSlideBackground(index, null)}
            className="h-7 w-9 rounded-md border border-payday-border text-xs text-payday-textMuted hover:border-accent"
          >
            ↺
          </button>
        </div>
        <label className="mt-3 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-payday-textDim/60">
            Cor sólida
          </span>
          <input
            type="color"
            aria-label="Cor sólida do fundo"
            className="h-9 w-full cursor-pointer rounded border border-payday-border bg-payday-surface"
            value={solid}
            onChange={(event) => setSlideBackground(index, event.target.value)}
          />
        </label>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-accent">
          Notas do apresentador
        </h3>
        <textarea
          aria-label="Notas do apresentador"
          className={`${inputClass} min-h-[140px] resize-y`}
          placeholder="Anotações que aparecem no modo S da apresentação"
          value={slideNotes(slide.html)}
          onChange={(event) => updateSlideNotes(index, event.target.value)}
        />
      </section>
    </div>
  );
}
