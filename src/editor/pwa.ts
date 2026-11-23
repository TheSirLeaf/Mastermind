// editor/pwa.ts
// O editor como aplicativo instalável: service worker (abre sem internet) e arquivos .mmdeck
// abertos pelo sistema (duplo clique no Explorer, "Abrir com…"), via `launchQueue`.
import { useUIStore } from '@stores/uiStore';

import { openDeckFile } from './actions';

interface LaunchParams {
  files: readonly FileSystemFileHandle[];
}
interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void;
}

/** Registra o service worker (só no build de produção: no dev ele atrapalharia o recarregamento). */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}

let listening = false;

/**
 * Abre os .mmdeck que o sistema entregou ao app instalado. Só o Chrome e o Edge entregam
 * arquivos assim; nos outros navegadores não faz nada.
 */
export function listenForLaunchedFiles(): void {
  const queue = (window as Window & { launchQueue?: LaunchQueue }).launchQueue;
  if (!queue || listening) return;
  listening = true;
  queue.setConsumer((params) => {
    void (async () => {
      // Com vários arquivos, abre um depois do outro: os anteriores ficam em Recentes.
      for (const handle of params.files) {
        try {
          if (await openDeckFile(await handle.getFile())) useUIStore.getState().closeWelcome();
        } catch {
          // openDeckFile já avisa o usuário quando o arquivo é inválido.
        }
      }
    })();
  });
}
