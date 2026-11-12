import type { FormSchema } from '../core/types';

export const codeForm: FormSchema = [
  {
    group: 'Conteúdo',
    icon: 'code',
    fields: [
      {
        k: 'file',
        label: 'Nome do arquivo',
        type: 'text',
        placeholder: 'Controls/AgendaUC.cs',
        help: 'Nome exibido na barra de título da janela de código',
      },
      {
        type: 'row',
        fields: [
          {
            k: 'tag',
            label: 'Etiqueta',
            type: 'text',
            placeholder: 'C#',
            help: 'Etiqueta exibida ao lado do nome do arquivo',
          },
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
            help: 'Define a coloração de sintaxe do código',
          },
        ],
      },
      {
        k: 'code',
        label: 'Código',
        type: 'code',
        rows: 20,
        help: 'Cole ou digite o código-fonte. Pressione Tab para inserir espaços.',
      },
    ],
  },
  {
    group: 'Aparência',
    icon: 'design',
    fields: [
      {
        k: 'palette',
        label: 'Cores do bloco',
        type: 'select',
        options: [
          ['default', 'Padrão (vinho e dourado)'],
          ['slate', 'Grafite'],
          ['midnight', 'Azul-noite'],
          ['paper', 'Papel'],
          ['custom', 'Personalizado'],
        ],
        help: 'Combine com o fundo do slide. A paleta da aba Slides ajuda a escolher.',
      },
      {
        k: 'theme',
        label: 'Tema da janela',
        type: 'seg',
        options: [
          ['dark', 'Escuro', 'moon'],
          ['light', 'Claro', 'sun'],
        ],
        showIf: { k: 'palette', eq: 'default' },
      },
      { k: 'lineNumbers', label: 'Linhas numeradas', type: 'toggle' },
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
    group: 'Cores personalizadas',
    icon: 'design',
    showIf: { k: 'palette', eq: 'custom' },
    fields: [
      {
        type: 'row',
        fields: [
          { k: 'cBg', label: 'Fundo', type: 'color' },
          { k: 'cFg', label: 'Texto', type: 'color' },
          { k: 'cAc', label: 'Destaque', type: 'color' },
        ],
      },
      {
        type: 'row',
        fields: [
          { k: 'cKw', label: 'Palavras', type: 'color' },
          { k: 'cStr', label: 'Textos', type: 'color' },
          { k: 'cNum', label: 'Números', type: 'color' },
        ],
      },
      {
        type: 'row',
        fields: [
          { k: 'cFn', label: 'Funções', type: 'color' },
          { k: 'cCm', label: 'Comentários', type: 'color' },
        ],
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
    workspace: 'animation',
    icon: 'play',
    fields: [
      {
        k: 'variant',
        label: 'Animação',
        type: 'select',
        options: [
          ['typing', 'Digitação'],
          ['terminal', 'Console (linha a linha)'],
        ],
        showIf: { k: 'typing', eq: true },
      },
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
