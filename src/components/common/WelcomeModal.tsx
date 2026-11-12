import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { FileText, FolderOpen, History, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import { newDeck, openDeckFile } from '../../editor/actions';

export function WelcomeModal() {
  const { isWelcomeOpen, closeWelcome, hasDraft } = useUIStore();
  const savedAt = useDeckStore((state) => state.savedAt);
  const slideCount = useDeckStore((state) => state.deck.slides.length);
  const [remember, setRemember] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isWelcomeOpen) return null;

  const close = () => closeWelcome(remember);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (await openDeckFile(file)) close();
  };

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-black/90 p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas"
    >
      <input
        ref={fileRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => void onFile(event)}
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-payday-border bg-payday-surface p-8 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-2 font-serif text-3xl font-bold text-accent">Bem-vindo ao Mastermind</h2>
        <p className="mb-6 text-payday-textMuted">
          Editor de apresentações com sistema de pacotes extensível
        </p>

        <div className="mb-6 space-y-3">
          {hasDraft ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-dark px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:brightness-110"
              onClick={close}
            >
              <History className="h-5 w-5" /> Continuar rascunho ({slideCount} slides
              {savedAt ? ` · ${new Date(savedAt).toLocaleString('pt-BR')}` : ''})
            </button>
          ) : null}
          <button
            type="button"
            className={
              hasDraft
                ? 'flex w-full items-center justify-center gap-2 rounded-lg border border-payday-border bg-payday-surface px-4 py-2.5 text-sm text-payday-text transition hover:bg-payday-panel'
                : 'flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-dark px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:brightness-110'
            }
            onClick={() => {
              if (hasDraft) newDeck();
              close();
            }}
          >
            <FileText className="h-5 w-5" /> Nova apresentação
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-payday-border bg-payday-surface px-4 py-2.5 text-sm text-payday-text transition hover:bg-payday-panel"
            onClick={() => fileRef.current?.click()}
          >
            <FolderOpen className="h-5 w-5" /> Abrir arquivo .html
          </button>
        </div>

        <label className="mx-auto flex cursor-pointer items-center justify-center gap-3 text-sm text-payday-textMuted">
          <input
            type="checkbox"
            className="accent-accent"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          <span>Não mostrar novamente</span>
        </label>

        <button
          type="button"
          className="absolute right-4 top-4 rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-accent"
          onClick={close}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
