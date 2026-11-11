import { slideBackground, slideNotes, slideTheme } from '@packages/core/deck';
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

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-gold-DEFAULT/40';

/** Tema, fundo e notas do apresentador do slide atual. */
export function SlideTab() {
  const index = useDeckStore((state) => state.currentIndex);
  const slide = useDeckStore((state) => state.deck.slides[state.currentIndex]);
  const setSlideTheme = useDeckStore((state) => state.setSlideTheme);
  const setSlideBackground = useDeckStore((state) => state.setSlideBackground);
  const updateSlideNotes = useDeckStore((state) => state.updateSlideNotes);

  if (!slide) return null;
  const theme = slideTheme(slide.html);
  const background = slideBackground(slide.html);
  const solid = /^#[0-9a-f]{6}$/i.test(background) ? background : '#2a0e1a';

  return (
    <div className="space-y-5 p-4">
      <section>
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-gold-DEFAULT">Tema</h3>
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
                  ? 'bg-gold-DEFAULT/20 text-gold-DEFAULT'
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
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-gold-DEFAULT">Fundo</h3>
        <div className="flex flex-wrap gap-1.5">
          {BACKGROUNDS.map(([name, css]) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={`Fundo ${name}`}
              onClick={() => setSlideBackground(index, css)}
              className="h-7 w-9 rounded-md border border-white/15 transition hover:border-gold-DEFAULT"
              style={{ background: css }}
            />
          ))}
          <button
            type="button"
            title="Fundo original do tema"
            aria-label="Restaurar fundo do tema"
            onClick={() => setSlideBackground(index, null)}
            className="h-7 w-9 rounded-md border border-payday-border text-xs text-payday-textMuted hover:border-gold-DEFAULT"
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
        <h3 className="mb-2 text-[10px] uppercase tracking-widest text-gold-DEFAULT">
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
