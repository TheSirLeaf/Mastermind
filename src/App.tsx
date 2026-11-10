import { ChevronLeft, ChevronRight, Copy, Layers, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { registerBuiltins } from './packages';
import {
  buildEditorHTML,
  IframeBridge,
  loadSavedDeck,
  loadSavedPackages,
  loadTemplate,
  saveDeck,
  setCachedTemplate,
} from './packages/core';
import { slideNotes } from './packages/core/deck';
import { registry } from './packages/core/PackageRegistry';
import type { SelectionInfo } from './packages/core/types';
import { getSlideTitle, useDeckStore } from './store/deckStore';

import './index.css';

let initialized = false;
function initPackages(): void {
  if (initialized) return;
  initialized = true;
  registerBuiltins(registry);
  void loadSavedPackages().then((packages) => {
    if (!packages?.length) return;
    try {
      registry.import(JSON.stringify({ format: 'dialcron-package', spec: 1, packages }));
    } catch {
      // Pacotes salvos inválidos não devem impedir a abertura do editor.
    }
  });
}

export default function App(): JSX.Element {
  const deck = useDeckStore((state) => state.deck);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const selection = useDeckStore((state) => state.selection);
  const canUndo = useDeckStore((state) => state.canUndo);
  const canRedo = useDeckStore((state) => state.canRedo);
  const savedAt = useDeckStore((state) => state.savedAt);

  const store = useDeckStore;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<IframeBridge | null>(null);
  const lastSlidesRef = useRef<string[]>([]);
  const lastIdsRef = useRef<string[]>([]);
  const [templateReady, setTemplateReady] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(initPackages, []);

  // Template + deck salvo.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const template = await loadTemplate();
        if (cancelled) return;
        setCachedTemplate(template);
        const saved = await loadSavedDeck();
        if (!cancelled && saved?.slides.length) store.getState().setDeck(saved);
        setTemplateReady(true);
      } catch (error) {
        console.error('Falha ao carregar o editor:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  // Ponte com o iframe.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !templateReady) return;

    const bridge = new IframeBridge(iframe, {
      onSelect: (value: SelectionInfo | null) => store.getState().setSelection(value),
      onEdit: (path, html) => store.getState().updateElementHTML(path, html),
      onSlideChange: (index) => store.getState().selectSlide(index),
    });
    bridgeRef.current = bridge;

    const html = buildEditorHTML(store.getState().deck, registry);
    lastSlidesRef.current = store.getState().deck.slides.map((slide) => slide.html);
    lastIdsRef.current = store.getState().deck.slides.map((slide) => slide.id);
    bridge.load(html);
    setBooted(true);

    return () => {
      bridge.destroy();
      bridgeRef.current = null;
      setBooted(false);
    };
  }, [templateReady, store]);

  // Navegação e estrutura: recarrega o documento quando o deck muda de forma.
  const slideCount = deck.slides.length;
  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge || !booted) return;
    bridge.goto(currentIndex);
  }, [currentIndex, booted]);

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge || !booted) return;
    const previous = lastSlidesRef.current;
    const current = deck.slides.map((slide) => slide.html);
    const previousIds = lastIdsRef.current;
    const currentIds = deck.slides.map((slide) => slide.id);
    const structural =
      previous.length !== current.length ||
      previousIds.length !== currentIds.length ||
      previousIds.some((id, index) => id !== currentIds[index]);

    if (structural) {
      bridge.load(buildEditorHTML(deck, registry));
      lastSlidesRef.current = current;
      return;
    }

    // Atualizações de HTML de um slide específico sem recarregar o iframe.
    current.forEach((html, index) => {
      if (previous[index] !== html && previous.length === current.length) {
        bridge.setSlideHTML(index, html);
      }
    });
    lastSlidesRef.current = current;
    lastIdsRef.current = currentIds;
  }, [deck, booted]);

  // Auto-save.
  useEffect(() => {
    if (!booted) return;
    const timer = window.setTimeout(() => {
      void saveDeck(deck)
        .then(() => store.getState().markSaved())
        .catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [deck, booted, store]);

  return (
    <div className="flex h-full flex-col bg-[#10060B] text-cream">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold" />
          <span className="text-sm font-semibold tracking-[0.2em] text-cream/80">MASTERMIND</span>
        </div>

        <input
          className="min-w-0 flex-1 rounded-md border border-transparent bg-white/5 px-3 py-1.5 text-sm text-cream/90 outline-none transition focus:border-gold/50"
          value={deck.title}
          onChange={(event) => store.getState().setTitle(event.target.value)}
          aria-label="Título da apresentação"
        />

        <div className="flex items-center gap-1">
          <ToolButton label="Desfazer" disabled={!canUndo} onClick={() => store.getState().undo()}>
            <Undo2 size={16} />
          </ToolButton>
          <ToolButton label="Refazer" disabled={!canRedo} onClick={() => store.getState().redo()}>
            <Redo2 size={16} />
          </ToolButton>
          <span className="ml-2 text-xs text-cream/35">
            {savedAt ? `salvo ${new Date(savedAt).toLocaleTimeString('pt-BR')}` : 'não salvo'}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-cream/40">
            <span className="flex items-center gap-1.5">
              <Layers size={13} /> Slides ({slideCount})
            </span>
            <button
              className="rounded p-1 text-cream/60 transition hover:bg-white/10 hover:text-gold"
              onClick={() => store.getState().addSlide()}
              title="Novo slide"
              type="button"
            >
              <Plus size={15} />
            </button>
          </div>

          <ol className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-2">
            {deck.slides.map((slide, index) => {
              const active = index === currentIndex;
              return (
                <li key={slide.id}>
                  <button
                    type="button"
                    onClick={() => store.getState().selectSlide(index)}
                    className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition ${
                      active ? 'bg-gold/15 text-cream' : 'text-cream/60 hover:bg-white/5'
                    }`}
                  >
                    <span className="mt-0.5 w-5 shrink-0 text-[10px] tabular-nums text-cream/35">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="line-clamp-2 text-xs leading-snug">
                      {getSlideTitle(slide)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="grid grid-cols-2 gap-1 border-t border-white/10 p-2">
            <button
              type="button"
              className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] text-cream/60 hover:bg-white/5"
              onClick={() => store.getState().duplicateSlide(currentIndex)}
            >
              <Copy size={13} /> Duplicar
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[11px] text-cream/60 hover:bg-white/5 disabled:opacity-30"
              disabled={slideCount <= 1}
              onClick={() => store.getState().deleteSlide(currentIndex)}
            >
              <Trash2 size={13} /> Excluir
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div
              className="relative overflow-hidden rounded-lg shadow-panel ring-1 ring-white/10"
              style={{ width: '100%', maxWidth: 'min(100%, 1280px)', aspectRatio: '16 / 9' }}
            >
              <iframe
                ref={iframeRef}
                className="h-full w-full border-0 bg-[#10060B]"
                title="Palco da apresentação"
              />
            </div>
          </div>

          <footer className="flex h-11 shrink-0 items-center justify-center gap-3 border-t border-white/10 text-xs text-cream/50">
            <button
              type="button"
              className="rounded p-1 hover:bg-white/10 hover:text-gold disabled:opacity-30"
              disabled={currentIndex === 0}
              onClick={() => store.getState().selectSlide(currentIndex - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="tabular-nums">
              {String(currentIndex + 1).padStart(2, '0')} / {String(slideCount).padStart(2, '0')}
            </span>
            <button
              type="button"
              className="rounded p-1 hover:bg-white/10 hover:text-gold disabled:opacity-30"
              disabled={currentIndex >= slideCount - 1}
              onClick={() => store.getState().selectSlide(currentIndex + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </footer>
        </main>

        <aside className="flex w-72 shrink-0 flex-col border-l border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-cream/40">
            Inspetor
          </div>
          <div className="space-y-4 p-4 text-sm">
            {selection ? (
              <div className="rounded-md border border-gold/20 bg-gold/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-gold/70">
                  Selecionado
                </div>
                <div className="mt-1 font-medium text-cream/90">{selection.label}</div>
                <div className="mt-1 font-mono text-[10px] text-cream/35">
                  &lt;{selection.tag}&gt; · {selection.path.join('.')}
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-cream/40">
                Clique em um elemento do slide para selecioná-lo. Dois cliques editam textos.
              </p>
            )}

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-cream/40">
                Notas do apresentador
              </span>
              <textarea
                className="h-24 w-full resize-none rounded-md border border-white/10 bg-black/20 p-2 text-xs text-cream/80 outline-none focus:border-gold/40"
                value={slideNotes(deck.slides[currentIndex]?.html ?? '')}
                onChange={(event) =>
                  store.getState().updateSlideNotes(currentIndex, event.target.value)
                }
              />
            </label>

            <div className="rounded-md border border-white/10 p-3 text-[11px] leading-relaxed text-cream/40">
              Domínio Core/Infra pronto. Inspector completo, pacotes e FormGenerator são
              responsabilidade dos agentes B e C.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: JSX.Element;
}

function ToolButton({ label, disabled, onClick, children }: ToolButtonProps): JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1.5 text-cream/60 transition hover:bg-white/10 hover:text-gold disabled:opacity-25"
    >
      {children}
    </button>
  );
}
