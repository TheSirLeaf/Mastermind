import type { FormSchema } from '../core/types';

export const qrForm: FormSchema = [
  {
    group: 'Conteúdo',
    icon: 'link',
    fields: [
      {
        k: 'roomLink',
        label: 'Sempre mostrar o link da sala',
        type: 'toggle',
        help: 'Mostra o QR do endereço de participação da sala ao vivo, qualquer que seja o código, e atualiza se ele mudar.',
      },
      {
        type: 'info',
        showIf: { k: 'roomLink', eq: true },
        text: 'O QR da sala aparece ao apresentar com a interação ao vivo ligada. Até lá, o editor mostra um exemplo esmaecido.',
      },
      {
        k: 'text',
        label: 'Link ou texto',
        type: 'textarea',
        rows: 3,
        placeholder: 'https://…',
        showIf: { k: 'roomLink', ne: true },
      },
    ],
  },
  {
    group: 'Aparência',
    icon: 'design',
    fields: [
      {
        k: 'size',
        label: 'Tamanho',
        type: 'range',
        min: 120,
        max: 900,
        step: 10,
        unit: ' px',
      },
      {
        type: 'row',
        fields: [
          { k: 'fg', label: 'Cor do QR', type: 'color' },
          { k: 'bg', label: 'Fundo', type: 'color' },
        ],
      },
      { k: 'margin', label: 'Borda', type: 'range', min: 0, max: 8, step: 1, unit: ' módulos' },
      {
        k: 'ecc',
        label: 'Correção de erros',
        type: 'select',
        options: [
          ['L', 'Baixa (QR mais simples)'],
          ['M', 'Média'],
          ['Q', 'Alta'],
          ['H', 'Máxima (QR mais denso)'],
        ],
        help: 'Mais correção deixa o QR legível mesmo sujo ou parcialmente coberto, mas ele fica mais denso.',
      },
      { k: 'showText', label: 'Escrever o link embaixo', type: 'toggle' },
    ],
  },
];
