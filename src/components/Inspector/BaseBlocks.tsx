// Blocos da aba Slides ligados aos slides base.
import { baseName, baseOwnId, slideBaseId, slidesUsingBase } from '@packages/core/bases';
import { itemAt, useDeckStore } from '@store/deckStore';
import { useState } from 'react';

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-accent/40';

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
        // O campo guarda o texto bruto (com espaços); o nome gravado é sempre aparado.
        if (event.target.value.trim()) onRename(event.target.value.trim());
      }}
      onBlur={() => setDraft(name)}
    />
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
      <p className="mt-2 text-[11px] leading-snug text-payday-textDim">
        Marca d’água, efeito de luz e contador estão no menu <b>Efeitos</b> da barra inferior do
        Editor.
      </p>
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
