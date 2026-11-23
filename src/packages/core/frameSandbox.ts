/**
 * `sandbox` das molduras que mostram a apresentação (visualizar, apresentar, miniaturas, tela
 * exibida e celular do espectador). Sem `allow-same-origin`, o documento ganha uma origem própria:
 * o código dos pacotes roda, mas não alcança o editor, o IndexedDB nem os dados do navegador.
 * A comunicação com o editor é só por `postMessage`.
 */
export const DECK_FRAME_SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';
