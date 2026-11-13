// live/roomLink.ts
// O link da sala e a mensagem que leva o QR para dentro da apresentação (iframes).
import { qrMatrix } from '../packages/qr/qrMatrix';

import { joinUrl } from './site';

export function roomUrl(code: string): string {
  return joinUrl(code);
}

export interface RoomMessage {
  __mm: 'room';
  url: string;
  matrix: string[];
}

/** Mensagem `postMessage` com o link da sala e a matriz do QR (o pacote QR a desenha). */
export function roomMessage(code: string): RoomMessage {
  const url = roomUrl(code);
  return { __mm: 'room', url, matrix: qrMatrix(url, 'M') };
}
