import { itemAt, useDeckStore } from '@store/deckStore';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface TreeNode {
  path: number[];
  tag: string;
  label: string;
  children: TreeNode[];
}

const TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'p', 'span', 'b', 'i', 'em', 'strong', 'li']);

function nodeLabel(element: Element, tag: string): string {
  const pkg = element.getAttribute('data-pkg');
  if (pkg) return `Pacote · ${pkg}`;
  const classes = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).slice(0, 2);
  const suffix = classes.length ? `.${classes.join('.')}` : '';
  if (TEXT_TAGS.has(tag)) {
    const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 28);
    if (text) return `${tag}${suffix} — ${text}`;
  }
  return `${tag}${suffix}`;
}

function buildNode(element: Element, path: number[]): TreeNode {
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.children)
    .filter((child) => child.id !== 'mm-sel')
    .map((child, index) => buildNode(child, [...path, index]));
  return { path, tag, label: nodeLabel(element, tag), children };
}

function Row({
  node,
  depth,
  selectedPath,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
}) {
  const [open, setOpen] = useState(depth < 2);
  const active = selectedPath === node.path.join('.');
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded px-1 py-0.5 text-[11px] ${
          active ? 'bg-accent/15 text-accent' : 'text-payday-text/70 hover:bg-white/5'
        }`}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <button
          type="button"
          className="flex h-4 w-4 shrink-0 items-center justify-center text-payday-text/40"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Recolher' : 'Expandir'}
          aria-expanded={open}
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <span className="h-1 w-1 rounded-full bg-current" />
          )}
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left"
          title={node.path.join('.')}
          onClick={() => useDeckStore.getState().requestSelection(node.path)}
        >
          {node.label}
        </button>
      </div>
      {open
        ? node.children.map((child) => (
            <Row
              key={child.path.join('.')}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
            />
          ))
        : null}
    </div>
  );
}

/**
 * Árvore de elementos do slide atual, com o parentesco por indentação.
 * Clicar em um nó seleciona o elemento no palco.
 */
export function ElementTree() {
  const deck = useDeckStore((state) => state.deck);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const selection = useDeckStore((state) => state.selection);
  const [open, setOpen] = useState(false);

  const slide = itemAt(deck, currentIndex);
  if (!slide) return null;

  const doc = new DOMParser().parseFromString(slide.html, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return null;
  const tree = buildNode(root, [currentIndex]);

  return (
    <div className="border-b border-white/10 bg-black/10">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-[10px] uppercase tracking-widest text-payday-text/45 transition hover:text-accent"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>Estrutura do slide</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open ? (
        <div className="max-h-40 overflow-auto px-2 pb-2">
          <Row node={tree} depth={0} selectedPath={selection ? selection.path.join('.') : null} />
        </div>
      ) : null}
    </div>
  );
}
