import type { FormSchema } from '../core/types';

import type { ChartSpec } from './ChartRenderer';

export const chartForm: FormSchema = [
  {
    group: 'Tipo',
    icon: 'chart',
    open: true,
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
    open: true,
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
    open: true,
    fields: [
      {
        type: 'row',
        fields: [
          { k: 'color', label: 'Cor', type: 'color' },
          { k: 'hlColor', label: 'Cor de destaque', type: 'color' },
        ],
      },
      {
        type: 'row',
        fields: [
          { k: 'max', label: 'Escala (máx.)', type: 'text', placeholder: 'auto' },
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
    icon: 'play',
    open: true,
    fields: [
      { k: 'animate', label: 'Animar a entrada', type: 'toggle' },
      {
        k: 'countUp',
        label: 'Contar os valores de 0 até o final',
        type: 'toggle',
        showIf: { k: 'animate', eq: true },
      },
      {
        k: 'delay',
        label: 'Atraso',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.1,
        unit: ' s',
        showIf: { k: 'animate', eq: true },
      },
    ],
  },
];
