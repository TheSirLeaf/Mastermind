import { Layout } from '@components/Layout/Layout';
import {
  loadTemplate,
  loadSavedDeck,
  loadSavedPackages,
  setCachedTemplate,
  saveDeck,
} from '@packages/core';
import { registry } from '@packages/core/PackageRegistry';
import { registerBuiltins } from '@packages/index';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { useEffect, useState } from 'react';

import { handleDroppedFile } from './editor/actions';
import { handleGlobalKey } from './editor/shortcuts';

let initialized = false;
function initPackagesOnce(): void {
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

export default function App() {
  const deck = useDeckStore((state) => state.deck);
  const store = useDeckStore;
  const [templateReady, setTemplateReady] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(initPackagesOnce, []);

  // Arrastar e soltar: imagem → insere no slide; .html → abre; .json → importa pacote.
  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      event.preventDefault();
      handleDroppedFile(file);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // Atalhos globais (fora do iframe do palco).
  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Template + deck salvo.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const template = await loadTemplate();
        if (cancelled) return;
        setCachedTemplate(template);
        const saved = await loadSavedDeck();
        if (!cancelled && saved?.slides.length) {
          store.getState().setDeck(saved);
          useUIStore.getState().setHasDraft(true);
        }
        setTemplateReady(true);
        setBooted(true);
      } catch (error) {
        console.error('Falha ao carregar o editor:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  // Auto-save.
  useEffect(() => {
    if (!booted) return;
    const timer = window.setTimeout(() => {
      saveDeck(deck)
        .then(() => store.getState().markSaved())
        .catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [deck, booted, store]);

  if (!templateReady) {
    return (
      <div className="flex h-full items-center justify-center bg-payday-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-payday-textMuted">Carregando Mastermind...</p>
        </div>
      </div>
    );
  }

  return <Layout />;
}
