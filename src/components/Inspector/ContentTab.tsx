// components/Inspector/ContentTab.tsx
import type { SelectionInfo } from '@packages/core/types';
import { useUIStore } from '@stores/uiStore';
import { useRef, type ReactNode } from 'react';

import { readImage } from '../../editor/actions';

import { mutateSelectedElement, readSelectedElement } from './elementSelection';
import { InspectorSection } from './InspectorSection';

const TEXT_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div']);

export function ContentTab({ selection }: { selection: SelectionInfo }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const element = readSelectedElement(selection);
  const tagName = selection.tag.toLowerCase();

  if (!element) {
    return <Hint>Elemento não encontrado no slide atual.</Hint>;
  }

  if (tagName === 'img') {
    const src = element.getAttribute('src') ?? '';
    const alt = element.getAttribute('alt') ?? '';
    return (
      <div className="space-y-4">
        <InspectorSection
          id="img"
          group="content"
          title="Imagem"
          icon={<Icon path="M3 3h18v18H3zM8.5 8.5h.01M21 15l-5-5L5 21" />}
          defaultOpen
        >
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                readImage(file)
                  .then((image) =>
                    mutateSelectedElement(selection, (node) => node.setAttribute('src', image.src))
                  )
                  .catch(() =>
                    useUIStore.getState().showToast('Não foi possível ler a imagem.', 'error')
                  );
              }}
            />
            <button
              type="button"
              className="w-full rounded border border-accent/40 bg-accent/10 px-2 py-1.5 text-xs text-accent transition hover:bg-accent/20"
              onClick={() => fileRef.current?.click()}
            >
              Trocar imagem…
            </button>
            <Field label="URL da imagem">
              <input
                type="url"
                className={inputClass}
                value={src}
                onChange={(event) =>
                  mutateSelectedElement(selection, (node) =>
                    node.setAttribute('src', event.target.value)
                  )
                }
                placeholder="https://exemplo.com/imagem.png"
              />
            </Field>
            <Field label="Texto alternativo">
              <input
                type="text"
                className={inputClass}
                value={alt}
                onChange={(event) =>
                  mutateSelectedElement(selection, (node) =>
                    node.setAttribute('alt', event.target.value)
                  )
                }
                placeholder="Descrição da imagem"
              />
            </Field>
            {src ? (
              <img
                src={src}
                alt={alt}
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,248,245,0.16)',
                }}
              />
            ) : null}
          </div>
        </InspectorSection>
      </div>
    );
  }

  if (element.hasAttribute('data-pkg')) {
    return (
      <Hint>
        Este elemento pertence a um pacote. Use a aba <b>Pacote</b> para editar as propriedades.
      </Hint>
    );
  }

  if (TEXT_TAGS.has(tagName)) {
    if (element.children.length > 0) {
      return (
        <Hint>
          Este elemento contém outros elementos. Editar o texto diretamente apagaria essa estrutura;
          selecione o texto interno que deseja alterar.
        </Hint>
      );
    }

    return (
      <div className="space-y-4">
        <InspectorSection
          id="text"
          group="content"
          title="Conteúdo do texto"
          icon={<Icon path="M4 7V4h16v3M9 20h6M12 4v16" />}
          defaultOpen
        >
          <div className="">
            <textarea
              className={`${inputClass} min-h-[140px] resize-y font-mono`}
              value={element.textContent ?? ''}
              onChange={(event) =>
                mutateSelectedElement(selection, (node) => {
                  node.textContent = event.target.value;
                })
              }
              placeholder="Digite o texto..."
              spellCheck
            />
          </div>
        </InspectorSection>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-white/10 p-3 text-[11px] leading-relaxed text-payday-textDim/60">
        Este tipo de elemento não tem conteúdo editável diretamente. Use a aba Estilo ou Pacote.
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-accent/40';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest text-payday-textDim/50">
        {label}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-white/10 p-3 text-[11px] leading-relaxed text-payday-textDim/60">
      {children}
    </div>
  );
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      className="h-4 w-4 text-accent"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d={path} />
    </svg>
  );
}
