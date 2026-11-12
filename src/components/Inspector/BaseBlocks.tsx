// Blocos da aba Slides ligados aos slides base.
import { baseName, baseOwnId, slideBaseId, slidesUsingBase } from '@packages/core/bases';
import { itemAt, useDeckStore } from '@store/deckStore';
import { Droplet, Hash, Sun } from 'lucide-react';
import { useState } from 'react';

import {
  BASE_ELEMENT_LABELS,
  insertBaseElement,
  type BaseElementKind,
} from '../../editor/insertBaseElement';

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-accent/40';

const ICONS: Record<BaseElementKind, typeof Sun> = {
  watermark: Droplet,
  light: Sun,
  counter: Hash,
};

/** Campo do nome: guarda o que se digita (inclusive vazio) e só grava nomes não vazios. */
function BaseNameInput({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  return (
    <input
      aria-label="Nome do slide base"
      className={inputClass}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        if (event.target.value.trim()) onRename(event.target.value);
      }}
      onBlur={() => setDraft(name)}
    />
  );
}

/** Botões para criar marca d'água, luz e contador no slide base atual. */
export function BaseFxButtons() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {BASE_ELEMENT_LABELS.map(([kind, label]) => {
        const Icon = ICONS[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => insertBaseElement(kind)}
            className="flex flex-col items-center gap-1 rounded-md border border-payday-border px-1 py-2 text-[10px] leading-tight text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Slide base selecionado: nome, uso e elementos de fundo. */
export function BaseBlock({ index }: { index: number }) {
  const deck = useDeckStore((state) => state.deck);
  const renameBase = useDeckStore((state) => state.renameBase);
  const item = itemAt(deck, index);
  if (!item) return null;
  const id = baseOwnId(item.html) ?? '';
  const uses = slidesUsingBase(deck, id).length;

  return (
    <section>
      <h3 className="mb-2 text-[10px] uppercase tracking-widest text-sky-400">Slide base</h3>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-payday-textDim/60">Nome</span>
        <BaseNameInput
          key={id}
          name={baseName(item.html)}
          onRename={(name) => renameBase(index, name)}
        />
      </label>
      <p className="mt-2 text-[11px] leading-snug text-payday-textDim">
        {uses === 0
          ? 'Nenhum slide usa esta base ainda.'
          : `Usada por ${uses} slide${uses === 1 ? '' : 's'} (em destaque azul no espaço).`}{' '}
        Tudo que você muda aqui vale para todos eles e não aparece como slide na apresentação.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {BASE_ELEMENT_LABELS.map(([kind, label]) => {
          const Icon = ICONS[kind];
          return (
            <button
              key={kind}
              type="button"
              onClick={() => insertBaseElement(kind)}
              className="flex flex-col items-center gap-1 rounded-md border border-payday-border px-1 py-2 text-[10px] leading-tight text-payday-textMuted transition hover:border-accent/50 hover:text-accent"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Slide normal: escolhe a base que define o fundo dele. */
export function SlideBaseBlock({ index }: { index: number }) {
  const deck = useDeckStore((state) => state.deck);
  const setSlideBase = useDeckStore((state) => state.setSlideBase);
  const selectSlide = useDeckStore((state) => state.selectSlide);
  const item = itemAt(deck, index);
  const bases = deck.bases ?? [];
  if (!item || bases.length === 0) return null;
  const current = slideBaseId(item.html) ?? '';
  const baseIndex = bases.findIndex((b) => baseOwnId(b.html) === current);

  return (
    <section>
      <h3 className="mb-2 text-[10px] uppercase tracking-widest text-accent">Slide base</h3>
      <select
        aria-label="Slide base"
        className={inputClass}
        value={current}
        onChange={(event) => setSlideBase(index, event.target.value || null)}
      >
        <option value="">Nenhum (fundo do próprio slide)</option>
        {bases.map((base) => (
          <option key={base.id} value={baseOwnId(base.html) ?? ''}>
            {baseName(base.html)}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[11px] leading-snug text-payday-textDim">
        O fundo, as luzes, a marca d’água e o contador vêm da base.
      </p>
      {baseIndex >= 0 ? (
        <button
          type="button"
          onClick={() => selectSlide(deck.slides.length + baseIndex)}
          className="mt-2 w-full rounded border border-sky-400/40 px-2 py-1.5 text-[11px] text-sky-300 transition hover:bg-sky-400/10"
        >
          Editar a base
        </button>
      ) : null}
    </section>
  );
}
