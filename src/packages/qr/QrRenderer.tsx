import type { HelperAPI, PackageSpec } from '../core/types';

import { qrSvg, type QrEcc } from './qrMatrix';

export interface QrSpec extends PackageSpec {
  /** Link ou texto do QR (ignorado quando `roomLink` está ligado). */
  text: string;
  /** Mostra sempre o link da sala ao vivo (atualiza sozinho quando o código muda). */
  roomLink: boolean;
  /** Lado do QR em px do slide. */
  size: number;
  fg: string;
  bg: string;
  /** Borda clara ao redor, em módulos. */
  margin: number;
  ecc: QrEcc;
  /** Escreve o link embaixo do QR. */
  showText: boolean;
}

/** Link de exemplo mostrado (esmaecido) enquanto não há sala. */
export const SAMPLE_ROOM_URL = 'https://mastermind.example/join/ABCDE';

export interface QrRendererProps {
  spec: QrSpec;
  h: HelperAPI;
}

export function QrRenderer({ spec }: QrRendererProps): JSX.Element {
  const placeholder = spec.roomLink;
  const content = placeholder ? SAMPLE_ROOM_URL : spec.text;
  const svg = qrSvg(content, spec.fg, spec.bg, spec.margin, spec.ecc);
  return (
    <div
      data-testid="pk-qr"
      className={`pk-qr${placeholder ? ' pk-qr-ph' : ''}`}
      style={{ width: `${spec.size}px` }}
    >
      <div
        className="pk-qr-code"
        style={{ width: `${spec.size}px`, height: `${spec.size}px` }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {spec.showText ? (
        <div className="pk-qr-text" data-testid="pk-qr-text">
          {placeholder ? 'Link da sala' : spec.text}
        </div>
      ) : null}
    </div>
  );
}
