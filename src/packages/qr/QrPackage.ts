import { createElement } from 'react';

import type { HelperAPI, PackageDef, Preset } from '../core/types';

import { qrForm } from './formSchema';
import { QrRenderer, type QrSpec } from './QrRenderer';
import { qrRuntime } from './QrRuntime';

export type { QrSpec };

export const qrCss = `
.pk-qr{display:flex;flex-direction:column;align-items:center;gap:14px;font-family:'DM Sans',system-ui,sans-serif}
.pk-qr .pk-qr-code{display:block;border-radius:10px;overflow:hidden;line-height:0}
.pk-qr .pk-qr-code svg{display:block}
.pk-qr .pk-qr-text{max-width:100%;font-size:26px;line-height:1.3;text-align:center;word-break:break-all;color:inherit;opacity:.9}
.pk-qr.pk-qr-ph .pk-qr-code{opacity:.22}
.pk-qr.pk-qr-ph .pk-qr-text{opacity:.4}
`;

export const qrDefaults: QrSpec = {
  text: 'https://',
  roomLink: false,
  size: 360,
  fg: '#000000',
  bg: '#FFFFFF',
  margin: 2,
  ecc: 'M',
  showText: false,
};

export const qrPresets: Preset<QrSpec>[] = [
  {
    name: 'Link da sala (ao vivo)',
    desc: 'Sempre mostra o link da sala; muda sozinho se o código mudar',
    spec: { roomLink: true, showText: true, size: 420 },
  },
  {
    name: 'Site ou link',
    desc: 'QR de um endereço qualquer',
    spec: { roomLink: false, text: 'https://', showText: true },
  },
];

export const QrPackage: PackageDef<QrSpec> = {
  id: 'qr',
  name: 'QR code',
  version: '1.0.0',
  icon: 'qr-code',
  category: 'Mídia',
  author: 'Dialcron',
  description:
    'QR code de um link ou texto, com tamanho definível. Pode mostrar sempre o link da sala ao vivo.',
  defaults: qrDefaults,
  presets: qrPresets,
  box: { w: 360 },
  form: qrForm,
  css: qrCss,
  render: (spec, h: HelperAPI) => createElement(QrRenderer, { spec, h }),
  // Referência direta: o runtime é serializado via String() e precisa ser autossuficiente.
  runtime: qrRuntime,
};
