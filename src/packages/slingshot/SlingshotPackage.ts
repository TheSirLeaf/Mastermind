import { createElement } from 'react';

import type { FormSchema, PackageDef, PackageSpec, PackageTransition } from '../core/types';

import { slingshotScene } from './slingshotRuntime';

export interface SlingshotSpec extends PackageSpec {
  /** Rótulo sob o estilingue. */
  leftLabel: string;
  /** Rótulo sob a pilha de blocos. */
  rightLabel: string;
  /** 15 palavras dos blocos, separadas por `;` (de baixo para cima, 3 por fileira). */
  blocks: string;
  /** Palavras (iguais às dos blocos) desenhadas em vermelho. */
  bugs: string;
  /** Dica no canto (vazio esconde). */
  skipText: string;
}

export const slingshotDefaults: SlingshotSpec = {
  leftLabel: '137 testes',
  rightLabel: 'o que pode quebrar',
  blocks:
    'SQL errado; FK quebrada; dado sujo; null; off-by-one; regressão; mapeamento; UPDATE; timezone; crash; rollback; leak; bug; bug; bug',
  bugs: 'bug; crash; regressão; null',
  skipText: 'clique para pular',
};

export const slingshotForm: FormSchema = [
  {
    group: 'Cena',
    icon: 'play',
    open: true,
    fields: [
      {
        type: 'info',
        text: 'O estilingue derruba a pilha de blocos e só então o conteúdo do slide aparece. Clique durante a cena para pular.',
      },
      { k: 'leftLabel', label: 'Rótulo do estilingue', type: 'text' },
      { k: 'rightLabel', label: 'Rótulo da pilha', type: 'text' },
      {
        k: 'blocks',
        label: 'Palavras dos blocos',
        type: 'textarea',
        rows: 4,
        help: '15 palavras separadas por ponto e vírgula, de baixo para cima (3 por fileira).',
      },
      {
        k: 'bugs',
        label: 'Blocos em vermelho',
        type: 'text',
        help: 'Palavras (iguais às dos blocos) separadas por ponto e vírgula.',
      },
      { k: 'skipText', label: 'Dica para pular', type: 'text' },
    ],
  },
];

export const slingshotCss = `
/* etiqueta dos elementos da versão 1 (antes de virar transição; a apresentação aberta os converte) */
.pk-shot{display:none}
.pk-shot-scene{position:absolute;inset:0;z-index:6;cursor:pointer}
.pk-shot-scene svg{position:absolute;left:0;top:0;width:1920px;height:1080px}
.slide.pk-shot-out .pk-shot-scene{opacity:0;transition:opacity .45s ease;pointer-events:none}
.slide.pk-shot-hold .content,.slide.pk-shot-hold .title{visibility:hidden}
.slide.pk-shot-hold .anim{animation:none!important;opacity:0!important}
.slide.pk-shot-out .content{animation:pkShotFade .6s ease both}
@keyframes pkShotFade{from{opacity:0}to{opacity:1}}
.pk-shot-wood{fill:none;stroke:#6B2B3E;stroke-linecap:round}
.pk-shot-wood.w22{stroke-width:22}.pk-shot-wood.w16{stroke-width:16}
.pk-shot-band{stroke:#8E3B52;stroke-width:9;stroke-linecap:round}
.pk-shot-blk{fill:#FFF8F5;stroke:#C9A7A9;stroke-width:2.5}
.pk-shot-blk.bug{fill:#F8DAD7;stroke:#C95C62}
.pk-shot-t{font:600 14px ui-monospace,Consolas,monospace;fill:#5C4B4E;text-anchor:middle}
.pk-shot-blk.bug + .pk-shot-t{fill:#8E2F36}
.pk-shot-lab{font:700 15px 'DM Sans',system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;fill:#8E3B52;text-anchor:middle}
.pk-shot-skip{font:500 14px 'DM Sans',system-ui,sans-serif;fill:#A89296;text-anchor:end;opacity:.8}
@media print{.pk-shot,.pk-shot-scene{display:none!important}}
`;

/** Entrada do slide durante a cena (o slide aparece logo; a cena fica por cima). */
const shotTransitionCss =
  '.t-in{animation:pkShotIn .35s ease both}.t-out{animation:pkShotOut .35s ease both}' +
  '@keyframes pkShotIn{from{opacity:0}to{opacity:1}}@keyframes pkShotOut{from{opacity:1}to{opacity:0}}';

export const SlingshotPackage: PackageDef<SlingshotSpec> = {
  id: 'slingshot',
  name: 'Abertura: estilingue',
  version: '2.0.0',
  icon: 'play',
  category: 'Transições',
  author: 'Dialcron',
  description:
    'Transição de slide: um estilingue derruba uma pilha de blocos com as suas palavras e depois revela o conteúdo. Clique pula a cena.',
  defaults: slingshotDefaults,
  form: [],
  css: slingshotCss,
  // Elementos da versão 1 continuam reconhecidos (e são convertidos na transição ao abrir).
  render: () => createElement('div', { className: 'pk-shot' }),
  movedToTransition: 'estilingue',
  transitions: [
    {
      id: 'estilingue',
      name: 'Estilingue',
      description: 'Cena de abertura: o estilingue derruba a pilha de blocos e revela o slide.',
      css: shotTransitionCss,
      defaults: slingshotDefaults,
      form: slingshotForm,
      // Referência direta: a cena é serializada via String() e precisa ser autossuficiente.
      scene: slingshotScene as NonNullable<PackageTransition['scene']>,
    },
  ],
};
