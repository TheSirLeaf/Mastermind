// live/roomLink.ts
// O link da sala e a mensagem que leva o QR para dentro da apresentação (iframes).
import { qrMatrix } from '../packages/qr/qrMatrix';

export function roomUrl(code: string, origin: string = location.origin): string {
  return `${origin}/join/${code}`;
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
