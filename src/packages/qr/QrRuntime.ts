import type { RuntimeAPI } from '../core/types';

import type { QrSpec } from './QrRenderer';

/**
 * QR da sala ao vivo: quando a apresentação recebe o link da sala (mensagem `{__mm:'room'}` da
 * visão do apresentador), troca o QR de exemplo pelo real e atualiza se o código mudar.
 *
 * Este arquivo é serializado via String() no export: tudo precisa ficar dentro da função.
 */
export function qrRuntime(root: HTMLElement, spec: QrSpec, _api: RuntimeAPI) {
  if (!spec.roomLink) return null;
  const code = root.querySelector('.pk-qr-code');
  const caption = root.querySelector('.pk-qr-text');
  const box = root.querySelector('.pk-qr');

  const draw = (room: { url?: string; matrix?: string[] } | undefined) => {
    if (!room || !room.matrix || !room.matrix.length || !code) return;
    const n = room.matrix.length;
    const margin = spec.margin;
    const size = n + margin * 2;
    let path = '';
    room.matrix.forEach((row, y) => {
      let x = 0;
      while (x < n) {
        if (row.charAt(x) !== '1') {
          x += 1;
          continue;
        }
        let end = x;
        while (end < n && row.charAt(end) === '1') end += 1;
        path +=
          'M' + (x + margin) + ' ' + (y + margin) + 'h' + (end - x) + 'v1h-' + (end - x) + 'z';
        x = end;
      }
    });
    code.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      size +
      ' ' +
      size +
      '" width="100%" height="100%" shape-rendering="crispEdges"><rect width="' +
      size +
      '" height="' +
      size +
      '" fill="' +
      spec.bg +
      '"/><path d="' +
      path +
      '" fill="' +
      spec.fg +
      '"/></svg>';
    if (box) box.classList.remove('pk-qr-ph');
    if (caption && room.url) caption.textContent = room.url;
  };

  const onRoom = (event: Event) => draw((event as CustomEvent).detail);
  draw((window as unknown as { __mmRoom?: { url?: string; matrix?: string[] } }).__mmRoom);
  document.addEventListener('mm-room', onRoom);
  return {
    play: () => undefined,
    // O QR já atualizado fica na tela (também ao imprimir); só para de ouvir.
    final: () => document.removeEventListener('mm-room', onRoom),
  };
}
