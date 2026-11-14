// Brilho que passa pelo texto: uma faixa de luz atravessa o texto de tempos em tempos.
// É uma animação contínua do elemento (aparece na linha do tempo).
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';

import { shinePatch } from '../../editor/elementFx';
import { DEFAULT_SHINE, parseShine, type TextShine } from '../../editor/textFx';
import { ColorField } from '../common/ColorField';
import { Slider } from '../Text/TextControls';

export function ShineSection({ path, element }: { path: number[]; element: Element | null }) {
  const shine = element ? parseShine(element.getAttribute('data-shine')) : null;
  const isText = Boolean(
    element && (element.textContent ?? '').trim() !== '' && !element.closest('[data-pkg]')
  );
  const save = (next: TextShine | null): void =>
    useDeckStore.getState().patchElement(path, shinePatch(next));
  const set = (patch: Partial<TextShine>): void => {
    if (shine) save({ ...shine, ...patch });
  };

  if (!isText) {
    return (
      <p className="text-[11px] leading-snug text-payday-textDim">
        O brilho que passa funciona em elementos com texto.
      </p>
    );
  }

  return (
    <div className="space-y-2.5" data-testid="shine-section">
      <label className="flex cursor-pointer items-center justify-between gap-2 text-[11px] text-payday-text">
        <span>
          Brilho que passa
          <span className="block text-[10px] text-payday-textDim">
            Uma faixa de luz atravessa o texto e repete
          </span>
        </span>
        <input
          type="checkbox"
          aria-label="Brilho que passa"
          checked={Boolean(shine)}
          onChange={(event) => {
            save(event.target.checked ? { ...DEFAULT_SHINE } : null);
            if (event.target.checked)
              window.setTimeout(() => useUIStore.getState().replayAnimations(), 60);
          }}
          className="h-4 w-4 accent-[#C77C8A]"
        />
      </label>
      {shine ? (
        <>
          <div className="flex items-center gap-2 text-[11px] text-payday-textDim">
            <ColorField
              compact
              value={shine.color}
              ariaLabel="Cor do brilho que passa"
              onChange={(color) => set({ color })}
            />
            Cor da luz
          </div>
          <Slider
            label="Começa em"
            value={shine.delay}
            min={0}
            max={10}
            step={0.05}
            unit="s"
            onChange={(delay) => set({ delay })}
          />
          <Slider
            label="Repete a cada"
            value={shine.seconds}
            min={0.6}
            max={12}
            step={0.1}
            unit="s"
            onChange={(seconds) => set({ seconds })}
          />
          <Slider
            label="Largura"
            value={shine.width}
            min={2}
            max={60}
            step={1}
            unit="%"
            onChange={(width) => set({ width })}
          />
          <Slider
            label="Ângulo"
            value={shine.angle}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(angle) => set({ angle })}
          />
          <button
            type="button"
            onClick={() => useUIStore.getState().replayAnimations()}
            className="rounded border border-white/10 px-2.5 py-1.5 text-[11px] text-payday-textMuted/70 transition hover:border-white/25 hover:text-payday-text"
          >
            Testar brilho
          </button>
        </>
      ) : null}
    </div>
  );
}
