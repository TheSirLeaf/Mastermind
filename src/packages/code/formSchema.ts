import type { FormSchema } from '../core/types';

export const codeForm: FormSchema = [
  {
    group: 'Conteúdo',
    icon: 'code',
    open: true,
    fields: [
      { k: 'file', label: 'Nome do arquivo', type: 'text', placeholder: 'Controls/AgendaUC.cs' },
      {
        type: 'row',
        fields: [
          { k: 'tag', label: 'Etiqueta', type: 'text', placeholder: 'C#' },
          {
            k: 'lang',
            label: 'Linguagem',
            type: 'select',
            options: [
              ['csharp', 'C#'],
              ['yaml', 'YAML'],
              ['json', 'JSON'],
              ['sql', 'SQL'],
              ['js', 'JavaScript'],
              ['py', 'Python'],
              ['text', 'Texto puro'],
            ],
          },
        ],
      },
      { k: 'code', label: 'Código', type: 'code', rows: 12 },
    ],
  },
  {
    group: 'Aparência',
    icon: 'design',
    open: true,
    fields: [
      {
        k: 'theme',
        label: 'Tema da janela',
        type: 'seg',
        options: [
          ['dark', 'Escuro', 'moon'],
          ['light', 'Claro', 'sun'],
        ],
      },
      {
        type: 'row',
        fields: [
          { k: 'fontSize', label: 'Fonte', type: 'range', min: 12, max: 40, step: 1, unit: 'px' },
          {
            k: 'lineHeight',
            label: 'Entrelinha',
            type: 'range',
            min: 1.2,
            max: 2.4,
            step: 0.05,
            unit: '×',
          },
        ],
      },
      { k: 'titlebar', label: 'Mostrar barra de título', type: 'toggle' },
      {
        k: 'note',
        label: 'Rodapé (opcional)',
        type: 'text',
        placeholder: 'Ex.: se algo falhar, tudo é desfeito',
      },
    ],
  },
  {
    group: 'Destaque de linhas',
    icon: 'highlight',
    open: false,
    fields: [
      {
        k: 'hl',
        label: 'Linhas em destaque',
        type: 'text',
        placeholder: '2, 4-6',
        help: 'Números de linha separados por vírgula; intervalos com hífen.',
      },
      { k: 'lineGlow', label: 'Realçar a linha digitada', type: 'toggle' },
    ],
  },
  {
    group: 'Animação',
    icon: 'play',
    open: true,
    fields: [
      { k: 'typing', label: 'Digitar o código', type: 'toggle' },
      { k: 'caret', label: 'Cursor piscando', type: 'toggle' },
      {
        k: 'cps',
        label: 'Velocidade',
        type: 'range',
        min: 8,
        max: 160,
        step: 1,
        unit: ' cps',
        showIf: { k: 'typing', eq: true },
      },
      {
        k: 'delay',
        label: 'Atraso',
        type: 'range',
        min: 0,
        max: 3000,
        step: 50,
        unit: ' ms',
        showIf: { k: 'typing', eq: true },
      },
    ],
  },
];
