// components/Inspector/ParentAndMedia.tsx
// Linha do "pai" do elemento (definir / soltar) e opções de reprodução quando ele é um vídeo.
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { Link2, Unlink, X } from 'lucide-react';

import { cancelPickParent, pickParent, releaseFromParent } from '../../editor/arrange';

import { mutateSelectedElement, readSelectedElement } from './elementSelection';

function describe(element: Element): string {
  const name = element.getAttribute('data-name')?.trim();
  if (name) return name;
  const tag = element.tagName.toLowerCase();
  if (tag === 'img') return 'Imagem';
  if (tag === 'video') return 'Vídeo';
  const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ');
  if (text) return `“${text.length > 22 ? `${text.slice(0, 22)}…` : text}”`;
  if (element.classList.contains('ed-shape')) return 'Forma';
  return 'Grupo';
}

const VIDEO_FLAGS: Array<[attr: string, label: string]> = [
  ['autoplay', 'Tocar ao entrar no slide'],
  ['loop', 'Repetir'],
  ['muted', 'Sem som'],
  ['controls', 'Mostrar controles'],
];

export function ParentAndMedia({ selection }: { selection: SelectionInfo }) {
  useDeckStore((state) => state.deck);
  const picking = useUIStore((state) => state.pickingParent);
  const element = readSelectedElement(selection);
  if (!element) return null;
  const parent = selection.path.length > 2 ? element.parentElement : null;
  const isVideo = element.tagName.toLowerCase() === 'video';

  const toggle = (attr: string, on: boolean) =>
    mutateSelectedElement(selection, (node) => {
      if (on) node.setAttribute(attr, '');
      else node.removeAttribute(attr);
    });

  return (
    <div className="space-y-2">
      <div
        data-testid="parent-row"
        className="flex items-center gap-2 rounded-md border border-payday-border px-2.5 py-1.5 text-[11px]"
      >
        <span className="min-w-0 flex-1 truncate text-payday-textDim">
          {parent ? (
            <>
              Dentro de <b className="text-payday-text">{describe(parent)}</b>
            </>
          ) : (
            'Sem pai (solto no slide)'
          )}
        </span>
        {picking ? (
          <button
            type="button"
            onClick={cancelPickParent}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-accent hover:bg-accent/10"
          >
            <X className="h-3 w-3" /> Cancelar
          </button>
        ) : (
          <button
            type="button"
            title="Depois clique no elemento que vai ser o pai. Eles passam a mover, animar e sumir juntos."
            onClick={pickParent}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-payday-text hover:bg-white/5"
          >
            <Link2 className="h-3 w-3" /> {parent ? 'Trocar' : 'Definir pai'}
          </button>
        )}
        {parent ? (
          <button
            type="button"
            title="Volta a ser independente, no mesmo lugar"
            onClick={releaseFromParent}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-payday-text hover:bg-white/5"
          >
            <Unlink className="h-3 w-3" /> Soltar
          </button>
        ) : null}
      </div>

      {isVideo ? (
        <div
          data-testid="video-options"
          className="grid grid-cols-2 gap-1.5 rounded-md border border-payday-border px-2.5 py-2 text-[11px] text-payday-textDim"
        >
          {VIDEO_FLAGS.map(([attr, label]) => (
            <label key={attr} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                aria-label={label}
                checked={element.hasAttribute(attr)}
                onChange={(event) => toggle(attr, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
