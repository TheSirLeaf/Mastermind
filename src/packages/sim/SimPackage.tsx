import type { FormSchema, PackageDef } from '../core/types';

import { simCss } from './sim.css';
import { SimRenderer } from './SimRenderer';
import { simRuntime } from './simRuntime';
import { agendaSteps, simDefaults, successSteps, type SimSpec } from './SimSpec';

export const simForm: FormSchema = [
  {
    group: 'Tela',
    icon: 'layout',
    open: true,
    fields: [
      {
        type: 'row',
        fields: [
          { k: 'appName', label: 'Aplicativo', type: 'text', placeholder: 'Dialcron' },
          { k: 'activeMenu', label: 'Item ativo', type: 'text', placeholder: 'Agenda' },
        ],
      },
      { k: 'subtitle', label: 'Subtítulo da lateral', type: 'text', placeholder: 'Sistema de agendamentos' },
      {
        k: 'menu',
        label: 'Menu lateral',
        type: 'text',
        placeholder: 'Agenda; Cadastros; Backup',
        help: 'Itens separados por ponto e vírgula.',
      },
      {
        type: 'row',
        fields: [
          { k: 'heading', label: 'Título da tela', type: 'text', placeholder: 'Agenda' },
          { k: 'date', label: 'Data / filtro', type: 'text', placeholder: '09/11/2026 ▾' },
        ],
      },
      {
        k: 'columns',
        label: 'Colunas da tabela',
        type: 'text',
        placeholder: 'Data e horário; Cliente; Profissional; Situação; Valor',
        help: 'Separe por ponto e vírgula.',
      },
      {
        type: 'row',
        fields: [
          { k: 'statusColumn', label: 'Coluna de situação', type: 'number', min: 0, max: 8, step: 1 },
          { k: 'width', label: 'Largura total', type: 'range', min: 1200, max: 1680, step: 20, unit: 'px' },
        ],
      },
      {
        k: 'rows',
        label: 'Linhas da tabela',
        type: 'list',
        addLabel: 'Adicionar linha',
        item: [
          {
            k: 'cells',
            label: 'Células',
            type: 'text',
            placeholder: '09:00; Marina Souza; Camila Rocha; Agendado; R$ 150,00',
            help: 'Na ordem das colunas, separadas por ponto e vírgula.',
          },
          {
            k: 'tone',
            label: 'Situação',
            type: 'select',
            options: [
              ['ok', 'Confirmado'],
              ['warn', 'Pendente'],
              ['danger', 'Cancelado'],
            ],
          },
          { k: 'isNew', label: 'Linha nova', type: 'check' },
        ],
        itemDefault: {
          cells: '09:00; Cliente; Profissional; Agendado; R$ 0,00',
          tone: 'warn',
          isNew: false,
        },
      },
      {
        k: 'fields',
        label: 'Campos do formulário',
        type: 'list',
        addLabel: 'Adicionar campo',
        item: [
          { k: 'label', label: 'Rótulo', type: 'text' },
          { k: 'value', label: 'Valor', type: 'text' },
        ],
        itemDefault: { label: 'Campo', value: 'Valor' },
      },
      {
        k: 'buttons',
        label: 'Botões',
        type: 'list',
        addLabel: 'Adicionar botão',
        item: [
          { k: 'label', label: 'Rótulo', type: 'text' },
          {
            k: 'tone',
            label: 'Estilo',
            type: 'select',
            options: [
              ['primary', 'Primário'],
              ['secondary', 'Secundário'],
              ['danger', 'Perigo'],
            ],
          },
        ],
        itemDefault: { label: 'Salvar', tone: 'primary' },
      },
    ],
  },
  {
    group: 'Transação',
    icon: 'database',
    open: true,
    fields: [
      { k: 'txTitle', label: 'Título', type: 'text', placeholder: 'BANCO · TRANSAÇÃO SQLITE' },
      {
        k: 'txChips',
        label: 'Tabelas',
        type: 'list',
        addLabel: 'Adicionar tabela',
        item: [
          { k: 'table', label: 'Tabela', type: 'text' },
          { k: 'detail', label: 'Detalhe', type: 'text' },
        ],
        itemDefault: { table: 'tabela', detail: 'registro gravado' },
      },
      {
        k: 'txNote',
        label: 'Nota de rollback',
        type: 'text',
        placeholder: '↻ e se a última etapa falhar?',
      },
    ],
  },
  {
    group: 'Mensagens',
    icon: 'message',
    open: false,
    fields: [
      { k: 'msgSuccess', label: 'Sucesso', type: 'text' },
      { k: 'msgError', label: 'Erro / rollback', type: 'text' },
      { k: 'msgConfirm', label: 'Confirmação', type: 'text' },
    ],
  },
  {
    group: 'Código',
    icon: 'code',
    open: true,
    fields: [
      { k: 'codeEnabled', label: 'Mostrar painel de código', type: 'toggle' },
      {
        type: 'row',
        fields: [
          { k: 'codeFile', label: 'Arquivo', type: 'text', placeholder: 'Controls/AgendaUC.cs' },
          { k: 'codeTag', label: 'Etiqueta', type: 'text', placeholder: 'C#' },
          {
            k: 'codeLang',
            label: 'Linguagem',
            type: 'select',
            options: [
              ['csharp', 'C#'],
              ['sql', 'SQL'],
              ['js', 'JavaScript'],
              ['py', 'Python'],
              ['json', 'JSON'],
              ['text', 'Texto puro'],
            ],
          },
        ],
      },
      { k: 'codeCode', label: 'Código', type: 'textarea', rows: 12 },
      { k: 'codeTyping', label: 'Digitar o código', type: 'toggle' },
      {
        type: 'row',
        fields: [
          {
            k: 'codeCps',
            label: 'Velocidade',
            type: 'range',
            min: 8,
            max: 160,
            step: 1,
            unit: ' cps',
            showIf: { k: 'codeTyping', eq: true },
          },
          {
            k: 'codeDelay',
            label: 'Atraso',
            type: 'range',
            min: 0,
            max: 3000,
            step: 50,
            unit: ' ms',
            showIf: { k: 'codeTyping', eq: true },
          },
        ],
      },
      {
        type: 'row',
        fields: [
          { k: 'codeFontSize', label: 'Fonte', type: 'range', min: 12, max: 28, step: 1, unit: 'px' },
          { k: 'codeLineHeight', label: 'Entrelinha', type: 'range', min: 1.2, max: 2.2, step: 0.02, unit: '×' },
        ],
      },
    ],
  },
  {
    group: 'Roteiro',
    icon: 'play',
    open: false,
    fields: [
      {
        type: 'info',
        text: 'Cada passo pode usar `at` (linha de código, 0-based) e `wait` (ms). Sem `at`, roda após a digitação. Ações: valid, state, stateTone, press, message, chips, chipDetails, row, note, rollback.',
      },
      {
        k: 'steps',
        label: 'Passos (JSON)',
        type: 'textarea',
        rows: 16,
        help: 'Aplicado em ordem; passos com a mesma linha rodam em sequência.',
      },
      {
        type: 'buttons',
        items: [
          {
            label: 'Roteiro: sucesso + rollback',
            icon: 'rotate-ccw',
            do: (spec) => {
              (spec as SimSpec).steps = JSON.stringify(agendaSteps, null, 2);
            },
          },
          {
            label: 'Roteiro: só sucesso',
            icon: 'check',
            do: (spec) => {
              (spec as SimSpec).steps = JSON.stringify(successSteps, null, 2);
            },
          },
        ],
      },
    ],
  },
];

const cadastroSteps: SimSpec['steps'] = JSON.stringify(
  [
    { wait: 500, valid: true },
    { wait: 900, press: 'Salvar', state: 'gravando…', stateTone: 'begin' },
    { wait: 800, state: 'COMMIT ✓', stateTone: 'ok', chips: ['ok'] },
    { wait: 400, message: 'success' },
  ],
  null,
  2
);

export const SimPackage: PackageDef<SimSpec> = {
  id: 'sim',
  name: 'Tela simulada',
  version: '1.0.0',
  icon: 'monitor-play',
  author: 'Dialcron',
  description:
    'Janela de aplicativo com tabela, formulário, transação e roteiro animado — código digitado, commit e rollback.',
  defaults: simDefaults,
  box: { w: 1680, h: 780 },
  presets: [
    {
      name: 'Agenda · salvar com rollback',
      desc: 'Reproduz o slide 11: valida, grava as três tabelas, faz commit e simula a falha.',
      spec: {},
    },
    {
      name: 'Cadastro · validação',
      desc: 'Tela sem código, com validação de formulário e confirmação.',
      spec: {
        ...simDefaults,
        appName: 'Dialcron',
        subtitle: 'Cadastro de clientes',
        menu: 'Clientes; Serviços; Agenda',
        activeMenu: 'Clientes',
        heading: 'Clientes',
        date: 'Novos cadastros',
        columns: 'Nome; Telefone; Situação',
        statusColumn: 2,
        rows: [
          { cells: ['Marina Souza', '(11) 98888-1010', 'Ativo'], tone: 'ok' },
          { cells: ['Paulo Lima', '(11) 97777-2020', 'Pendente'], tone: 'warn' },
        ],
        fields: [
          { label: 'Nome', value: 'Marina Souza' },
          { label: 'Telefone', value: '(11) 98888-1010' },
          { label: 'E-mail', value: 'marina@exemplo.com' },
          { label: 'Observação', value: 'Cliente desde 2024' },
        ],
        buttons: [
          { label: 'Limpar', tone: 'secondary' },
          { label: 'Salvar', tone: 'primary' },
        ],
        codeEnabled: false,
        txTitle: 'BANCO · CADASTRO',
        txChips: [{ table: 'cad_cliente', detail: 'Id gerado' }],
        txNote: '',
        steps: cadastroSteps,
      },
    },
  ],
  form: simForm,
  css: simCss,
  render: (spec, h) => <SimRenderer spec={spec} h={h} />,
  runtime: simRuntime,
  duration: (spec) => {
    let steps: typeof agendaSteps = [];
    if (Array.isArray(spec.steps)) steps = spec.steps;
    else {
      try {
        const parsed: unknown = JSON.parse(spec.steps || '[]');
        if (Array.isArray(parsed)) steps = parsed as typeof agendaSteps;
      } catch {
        steps = [];
      }
    }
    const typing =
      spec.codeEnabled && spec.codeTyping
        ? (spec.codeCode.length / Math.max(10, spec.codeCps)) * 1000 + spec.codeDelay
        : 0;
    const waits = steps.reduce((total, step) => total + (step.wait ?? 0), 0);
    return Math.round(typing + waits + 1500);
  },
};
