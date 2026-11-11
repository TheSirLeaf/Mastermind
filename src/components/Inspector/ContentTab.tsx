// components/Inspector/ContentTab.tsx
import type { SelectionInfo } from '@packages/core/types';
import type { ReactNode } from 'react';

import { mutateSelectedElement, readSelectedElement } from './elementSelection';

const TEXT_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div']);

export function ContentTab({ selection }: { selection: SelectionInfo }) {
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
        <details className="group open" open>
          <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-payday-textDim/50">
            <Icon path="M3 3h18v18H3zM8.5 8.5h.01M21 15l-5-5L5 21" />
            Imagem
          </summary>
          <div className="space-y-3 px-3 pb-3 pt-2">
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
        </details>
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
        <details className="group open" open>
          <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-payday-textDim/50">
            <Icon path="M4 7V4h16v3M9 20h6M12 4v16" />
            Conteúdo do texto
          </summary>
          <div className="px-3 pb-3 pt-2">
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
        </details>
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
  'w-full rounded border border-payday-border bg-payday-surface px-2 py-1.5 text-xs text-payday-text outline-none focus:border-gold-DEFAULT/40';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-widest text-payday-textDim/50">{label}</label>
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
        className="h-4 w-4 text-gold-DEFAULT"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d={path} />
    </svg>
  );
}
