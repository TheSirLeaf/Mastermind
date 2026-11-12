import type { FormSchema } from '../core/types';

import type { ChartSpec } from './ChartRenderer';

export const chartForm: FormSchema = [
  {
    group: 'Tipo',
    icon: 'chart',
    fields: [
      {
        k: 'kind',
        type: 'seg',
        options: [
          ['bar', 'Barras', 'chart'],
          ['hbar', 'Horizontal', 'hbars'],
          ['line', 'Linha', 'line'],
          ['donut', 'Rosca', 'donut'],
        ],
      },
      { k: 'title', label: 'Título (opcional)', type: 'text' },
    ],
  },
  {
    group: 'Dados',
    icon: 'table',
    fields: [
      {
        k: 'rows',
        type: 'list',
        addLabel: 'Adicionar item',
        item: [
          { k: 'label', type: 'text', placeholder: 'Rótulo', w: '1fr' },
          { k: 'val', type: 'text', placeholder: 'Valor', w: '64px' },
          { k: 'hl', type: 'check', title: 'Destacar', w: '24px' },
        ],
        itemDefault: { label: 'novo', val: '1', hl: false },
        showIf: { k: 'colorMode', in: ['single', undefined] },
      },
      {
        k: 'rows',
        type: 'list',
        addLabel: 'Adicionar item',
        item: [
          { k: 'label', type: 'text', placeholder: 'Rótulo', w: '1fr' },
          { k: 'val', type: 'text', placeholder: 'Valor', w: '56px' },
          { k: 'color', type: 'color', title: 'Cor do item', w: '34px' },
        ],
        itemDefault: { label: 'novo', val: '1', color: '#9CC5E8' },
        showIf: { k: 'colorMode', in: ['palette', 'custom'] },
      },
      {
        type: 'buttons',
        items: [
          {
            label: 'Inverter ordem',
            icon: 'swap',
            do: (spec) => {
              const rows = (spec as ChartSpec).rows;
              rows?.reverse();
            },
          },
        ],
      },
    ],
  },
  {
    group: 'Aparência',
    icon: 'design',
    fields: [
      {
        k: 'colorMode',
        label: 'Cores',
        type: 'seg',
        options: [
          ['single', 'Uma cor'],
          ['palette', 'Paleta'],
          ['custom', 'Por item'],
        ],
      },
      {
        type: 'row',
        showIf: { k: 'colorMode', in: ['single', undefined] },
        fields: [
          { k: 'color', label: 'Cor', type: 'color' },
          { k: 'hlColor', label: 'Cor de destaque', type: 'color' },
        ],
      },
      {
        type: 'info',
        showIf: { k: 'colorMode', eq: 'palette' },
        text: 'Cada item recebe uma cor da paleta automaticamente.',
      },
      {
        type: 'info',
        showIf: { k: 'colorMode', eq: 'custom' },
        text: 'Escolha a cor de cada item na lista de Dados.',
      },
      {
        type: 'row',
        fields: [
          { k: 'max', label: 'Escala (máx.)', type: 'text', placeholder: 'auto' },
          { k: 'prefix', label: 'Prefixo', type: 'text', placeholder: 'R$ ' },
          { k: 'suffix', label: 'Sufixo', type: 'text', placeholder: '%' },
        ],
      },
      { k: 'decimals', label: 'Casas decimais', type: 'range', min: 0, max: 3, step: 1 },
      { k: 'showValues', label: 'Mostrar valores', type: 'toggle' },
      {
        k: 'grid',
        label: 'Linhas de grade',
        type: 'toggle',
        showIf: { k: 'kind', in: ['bar', 'line'] },
      },
    ],
  },
  {
    group: 'Animação',
    workspace: 'animation',
    icon: 'play',
    fields: [
      { k: 'animate', label: 'Animar a entrada', type: 'toggle' },
      {
        k: 'animStyle',
        label: 'Como entram os itens',
        type: 'seg',
        options: [
          ['grow', 'Crescer'],
          ['fade', 'Aparecer'],
          ['rise', 'Subir'],
        ],
        showIf: { k: 'animate', eq: true },
      },
      {
        k: 'animDuration',
        label: 'Duração de cada item',
        type: 'range',
        min: 0.2,
        max: 3,
        step: 0.1,
        unit: ' s',
        showIf: { k: 'animate', eq: true },
      },
      {
        k: 'stagger',
        label: 'Intervalo entre itens',
        type: 'range',
        min: 0,
        max: 0.6,
        step: 0.02,
        unit: ' s',
        showIf: { k: 'animate', eq: true },
      },
      {
        k: 'delay',
        label: 'Atraso inicial',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.1,
        unit: ' s',
        showIf: { k: 'animate', eq: true },
      },
      {
        k: 'animEase',
        label: 'Curva',
        type: 'select',
        options: [
          ['cubic-bezier(.2,.8,.2,1)', 'Suave (padrão)'],
          ['ease-out', 'Saída rápida'],
          ['linear', 'Linear'],
          ['cubic-bezier(.2,1.3,.35,1)', 'Elástico'],
        ],
        showIf: { k: 'animate', eq: true },
      },
      {
        k: 'countUp',
        label: 'Contar os valores de 0 até o final',
        type: 'toggle',
        showIf: { k: 'animate', eq: true },
      },
    ],
  },
];
