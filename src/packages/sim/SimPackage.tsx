import type { FormSchema, PackageDef } from '../core/types';

import { simCss } from './sim.css';
import { SimRenderer } from './SimRenderer';
import { simRuntime } from './simRuntime';
import {
  agendaSteps,
  codeWindowsOf,
  normalizeSteps,
  simBlank,
  simDefaults,
  successSteps,
  taskListSteps,
  windowsToastSteps,
  type SimSpec,
} from './SimSpec';

const LANGS: Array<[string, string]> = [
  ['csharp', 'C#'],
  ['yaml', 'YAML'],
  ['sql', 'SQL'],
  ['js', 'JavaScript'],
  ['py', 'Python'],
  ['json', 'JSON'],
  ['text', 'Texto puro'],
];

export const simForm: FormSchema = [
  {
    group: 'Janela',
    icon: 'layout',
    open: true,
    fields: [
      {
        type: 'row',
        fields: [
          { k: 'appName', label: 'Aplicativo', type: 'text', placeholder: 'Meu aplicativo' },
          { k: 'tagText', label: 'Etiqueta', type: 'text', placeholder: 'SIMULAÇÃO' },
        ],
      },
      {
        type: 'row',
        fields: [
          { k: 'heading', label: 'Título da tela', type: 'text', placeholder: 'Agenda' },
          { k: 'date', label: 'Filtro / data', type: 'text', placeholder: '09/11/2026 ▾' },
        ],
      },
      {
        k: 'width',
        label: 'Largura total',
        type: 'range',
        min: 900,
        max: 1680,
        step: 20,
        unit: 'px',
      },
    ],
  },
  {
    group: 'Barra lateral',
    icon: 'layout',
    open: false,
    fields: [
      { k: 'sideShow', label: 'Mostrar barra lateral', type: 'toggle' },
      {
        type: 'row',
        fields: [
          { k: 'logoText', label: 'Letras do logo', type: 'text', placeholder: 'D' },
          { k: 'activeMenu', label: 'Item ativo', type: 'text', placeholder: 'Agenda' },
        ],
      },
      {
        k: 'logoImage',
        label: 'Imagem do logo (opcional)',
        type: 'text',
        placeholder: 'https://… ou data:image/…',
        help: 'Substitui as letras.',
      },
      { k: 'subtitle', label: 'Subtítulo', type: 'text', placeholder: 'Sistema de agendamentos' },
      {
        k: 'menu',
        label: 'Menu',
        type: 'text',
        placeholder: 'Agenda; Cadastros; Backup',
        help: 'Itens separados por ponto e vírgula.',
      },
    ],
  },
  {
    group: 'Tabela',
    icon: 'table',
    open: false,
    fields: [
      { k: 'tableTitle', label: 'Título do grupo', type: 'text', placeholder: 'Registros' },
      {
        k: 'columns',
        label: 'Colunas',
        type: 'text',
        placeholder: 'Nome; Telefone; Situação',
        help: 'Separe por ponto e vírgula. Vazio esconde a tabela.',
      },
      { k: 'statusColumn', label: 'Coluna com a bolinha', type: 'number', min: 0, max: 8, step: 1 },
      {
        k: 'rows',
        label: 'Linhas',
        type: 'list',
        addLabel: 'Adicionar linha',
        item: [
          {
            k: 'cells',
            label: 'Células',
            type: 'text',
            placeholder: 'Marina Souza; (11) 98888-1010; Ativo',
            help: 'Na ordem das colunas, separadas por ponto e vírgula.',
          },
          {
            k: 'tone',
            label: 'Situação',
            type: 'select',
            options: [
              ['ok', 'Verde'],
              ['warn', 'Amarelo'],
              ['danger', 'Vermelho'],
            ],
            w: '86px',
          },
          {
            k: 'isNew',
            label: 'Linha nova',
            type: 'check',
            title: 'Aparece só com o roteiro',
            w: '24px',
          },
          {
            k: 'leaves',
            label: 'Linha que sai',
            type: 'check',
            title: 'Some no fim do roteiro',
            w: '24px',
          },
        ],
        itemDefault: {
          cells: 'Valor 1; Valor 2; Situação',
          tone: 'warn',
          isNew: false,
          leaves: false,
        },
      },
    ],
  },
  {
    group: 'Formulário e botões',
    icon: 'text',
    open: false,
    fields: [
      {
        type: 'row',
        fields: [
          { k: 'formTitle', label: 'Título do grupo', type: 'text', placeholder: 'Cadastro' },
          { k: 'validText', label: 'Selo de validação', type: 'text', placeholder: '✓ válido' },
        ],
      },
      {
        k: 'fields',
        label: 'Campos',
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
      {
        k: 'buttonsAt',
        label: 'Botões ficam',
        type: 'seg',
        options: [
          ['form', 'No formulário'],
          ['table', 'Na tabela'],
        ],
      },
    ],
  },
  {
    group: 'Lista de tarefas e resumo',
    icon: 'table',
    open: false,
    fields: [
      {
        type: 'info',
        text: 'Testes, passos de um pipeline, etapas de instalação… O roteiro marca cada item como parado, rodando ou concluído.',
      },
      {
        type: 'row',
        fields: [
          { k: 'listTitle', label: 'Título', type: 'text', placeholder: 'build-and-test' },
          { k: 'listSub', label: 'Detalhe', type: 'text', placeholder: '8 testes' },
        ],
      },
      { k: 'listAction', label: 'Botão da lista', type: 'text', placeholder: '▶ Executar' },
      {
        k: 'items',
        label: 'Itens',
        type: 'list',
        addLabel: 'Adicionar item',
        item: [{ k: 'label', label: 'Texto', type: 'text' }],
        itemDefault: { label: 'Novo item' },
      },
      {
        type: 'row',
        fields: [
          { k: 'sumValue', label: 'Número do resumo', type: 'text', placeholder: '137' },
          { k: 'sumLabel', label: 'Rótulo', type: 'text', placeholder: 'testes aprovados' },
        ],
      },
      {
        k: 'sumSub',
        label: 'Detalhe do resumo',
        type: 'text',
        placeholder: '10 classes · 0 falhas',
      },
    ],
  },
  {
    group: 'Diálogos',
    icon: 'message',
    open: false,
    fields: [
      { k: 'msgSuccess', label: 'Mensagem de sucesso', type: 'text' },
      { k: 'msgError', label: 'Mensagem de erro', type: 'text' },
      { k: 'msgConfirm', label: 'Pergunta de confirmação', type: 'text' },
      {
        k: 'dialogs',
        label: 'Outros diálogos',
        type: 'list',
        addLabel: 'Adicionar diálogo',
        help: 'O roteiro abre cada um com dialog: "id".',
        item: [
          { k: 'id', label: 'ID', type: 'text', placeholder: 'salvar', w: '64px' },
          { k: 'title', label: 'Título', type: 'text', placeholder: 'Salvar como' },
          {
            k: 'kind',
            label: 'Tipo',
            type: 'select',
            options: [
              ['info', 'Aviso'],
              ['error', 'Erro'],
              ['question', 'Pergunta'],
              ['file', 'Arquivo'],
            ],
            w: '80px',
          },
          { k: 'text', label: 'Texto', type: 'text', placeholder: 'Mensagem' },
          { k: 'buttons', label: 'Botões', type: 'text', placeholder: 'Sim; Não', w: '80px' },
          { k: 'rows', label: 'Linhas', type: 'text', placeholder: 'Nome: backup.db; Tipo: *.db' },
        ],
        itemDefault: {
          id: 'aviso',
          title: '',
          kind: 'info',
          text: 'Mensagem',
          buttons: 'OK',
          rows: '',
        },
      },
    ],
  },
  {
    group: 'Avisos flutuantes',
    icon: 'bell',
    open: false,
    fields: [
      {
        k: 'toasts',
        label: 'Avisos',
        type: 'list',
        addLabel: 'Adicionar aviso',
        help: 'O roteiro mostra/esconde cada aviso pelo id.',
        item: [
          { k: 'id', label: 'ID', type: 'text', placeholder: 'backup' },
          { k: 'app', label: 'Aplicativo', type: 'text', placeholder: 'Sistema' },
          { k: 'title', label: 'Título', type: 'text', placeholder: 'Concluído' },
          { k: 'body', label: 'Mensagem', type: 'textarea', rows: 3 },
          {
            k: 'tone',
            label: 'Tom',
            type: 'select',
            options: [
              ['info', 'Informação'],
              ['success', 'Sucesso'],
              ['warning', 'Atenção'],
              ['error', 'Erro'],
            ],
          },
          { k: 'icon', label: 'Ícone', type: 'text', placeholder: '✓' },
          { k: 'time', label: 'Horário', type: 'text', placeholder: 'agora' },
          { k: 'action', label: 'Ação', type: 'text', placeholder: 'Abrir local' },
          { k: 'visible', label: 'Visível no estado final', type: 'check' },
          {
            k: 'autoHide',
            label: 'Fechar sozinho após',
            type: 'number',
            min: 0,
            step: 100,
            unit: ' ms',
          },
        ],
        itemDefault: {
          id: 'aviso',
          app: 'Sistema',
          title: 'Notificação',
          body: 'Mensagem do sistema.',
          tone: 'info',
          time: 'agora',
          visible: true,
          autoHide: 0,
        },
      },
    ],
  },
  {
    group: 'Mouse',
    icon: 'mouse-pointer-2',
    open: false,
    fields: [
      { k: 'cursorVisible', label: 'Mostrar cursor', type: 'toggle' },
      {
        type: 'row',
        fields: [
          { k: 'cursorX', label: 'X inicial', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
          { k: 'cursorY', label: 'Y inicial', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
        ],
      },
      { k: 'cursorSize', label: 'Tamanho', type: 'range', min: 16, max: 44, step: 1, unit: ' px' },
      { k: 'cursorTrail', label: 'Rastro de movimento', type: 'toggle' },
    ],
  },
  {
    group: 'Painel inferior',
    icon: 'database',
    open: false,
    fields: [
      {
        type: 'info',
        text: 'Mostra o que acontece por trás da tela: etapas ligadas por setas e/ou uma tabela. Sem etapas nem colunas, o painel some.',
      },
      { k: 'txTitle', label: 'Título', type: 'text', placeholder: 'BANCO · TRANSAÇÃO' },
      {
        type: 'row',
        fields: [
          { k: 'txStateStart', label: 'Estado inicial', type: 'text', placeholder: 'aguardando' },
          { k: 'txState', label: 'Estado final', type: 'text', placeholder: 'concluído ✓' },
        ],
      },
      {
        k: 'txStateTone',
        label: 'Cor do estado final',
        type: 'select',
        options: [
          ['ok', 'Verde'],
          ['begin', 'Amarelo'],
          ['rollback', 'Vermelho'],
          ['idle', 'Neutro'],
        ],
      },
      {
        k: 'txChips',
        label: 'Etapas',
        type: 'list',
        addLabel: 'Adicionar etapa',
        item: [
          { k: 'table', label: 'Nome', type: 'text' },
          { k: 'detail', label: 'Detalhe', type: 'text' },
          { k: 'arrow', label: 'Seta', type: 'text', placeholder: '→', w: '56px' },
        ],
        itemDefault: { table: 'etapa', detail: 'concluída', arrow: '→' },
      },
      {
        k: 'dbColumns',
        label: 'Colunas da tabela',
        type: 'text',
        placeholder: 'id; situacao; valor',
        help: 'Separe por ponto e vírgula. Vazio esconde a tabela.',
      },
      {
        k: 'dbRows',
        label: 'Linhas da tabela',
        type: 'list',
        addLabel: 'Adicionar linha',
        item: [
          { k: 'cells', label: 'Final', type: 'text', placeholder: '3; E; 150,00' },
          { k: 'start', label: 'No começo', type: 'text', placeholder: '3; a; 150,00' },
          { k: 'highlight', label: 'Destacar', type: 'check', title: 'Destacar', w: '24px' },
        ],
        itemDefault: { cells: '1; valor', start: '', highlight: false },
      },
      {
        k: 'txNote',
        label: 'Notas',
        type: 'text',
        placeholder: 'destino livre ✓; caminho validado ✓',
        help: 'Separe por ponto e vírgula. O roteiro mostra com note.',
      },
    ],
  },
  {
    group: 'Código',
    icon: 'code',
    open: false,
    fields: [
      { k: 'codeEnabled', label: 'Mostrar painel de código', type: 'toggle' },
      {
        type: 'row',
        fields: [
          { k: 'codeFile', label: 'Arquivo', type: 'text', placeholder: 'src/arquivo.cs' },
          { k: 'codeTag', label: 'Etiqueta', type: 'text', placeholder: 'C#' },
        ],
      },
      { k: 'codeLang', label: 'Linguagem', type: 'select', options: LANGS },
      { k: 'codeCode', label: 'Código', type: 'textarea', rows: 12 },
      { k: 'codeNote', label: 'Rodapé do código', type: 'text', placeholder: 'Opcional' },
      {
        k: 'codes',
        label: 'Outras janelas de código',
        type: 'list',
        addLabel: 'Adicionar janela',
        help: 'Digitadas em seguida; as linhas continuam a contagem da primeira.',
        item: [
          { k: 'file', label: 'Arquivo', type: 'text', placeholder: 'outro.cs' },
          { k: 'tag', label: 'Etiqueta', type: 'text', placeholder: 'C#', w: '48px' },
          { k: 'lang', label: 'Linguagem', type: 'select', options: LANGS, w: '70px' },
          { k: 'code', label: 'Código', type: 'textarea', rows: 5 },
        ],
        itemDefault: { file: 'arquivo.cs', tag: 'C#', lang: 'csharp', code: '// código' },
      },
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
          {
            k: 'codeFontSize',
            label: 'Fonte',
            type: 'range',
            min: 12,
            max: 28,
            step: 1,
            unit: 'px',
          },
          {
            k: 'codeLineHeight',
            label: 'Entrelinha',
            type: 'range',
            min: 1.2,
            max: 2.2,
            step: 0.02,
            unit: '×',
          },
        ],
      },
    ],
  },
  {
    group: 'Roteiro',
    workspace: 'animation',
    icon: 'play',
    open: false,
    fields: [
      {
        type: 'info',
        text: 'Cada passo pode ter `at` (linha de código, a partir de 0, contando todas as janelas) e `wait` (ms). Sem `at`, roda depois da digitação. Ações: press (botão ou item do menu), valid, state + stateTone, chips, chipDetails, row {index, action: show|hide|highlight|select|clear}, message (success|error|confirm), dialog ("id"), hideMessage, note (true ou posição), cell {row, col, text, tone}, item {index, status: idle|run|ok|fail|mark}, items, runItems (ms por item), count (ms), errLine, rollback, cursor e toast.',
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
            label: 'Sucesso + rollback',
            icon: 'rotate-ccw',
            do: (spec) => {
              (spec as SimSpec).steps = JSON.stringify(agendaSteps, null, 2);
            },
          },
          {
            label: 'Só sucesso',
            icon: 'check',
            do: (spec) => {
              (spec as SimSpec).steps = JSON.stringify(successSteps, null, 2);
            },
          },
          {
            label: 'Lista de tarefas',
            icon: 'play',
            do: (spec) => {
              (spec as SimSpec).steps = JSON.stringify(taskListSteps, null, 2);
            },
          },
        ],
      },
    ],
  },
];

/** Tela vazia: ponto de partida dos modelos que não são o exemplo padrão. */
const emptyScreen: SimSpec = {
  ...simDefaults,
  ...simBlank,
  appName: 'Aplicativo',
  subtitle: '',
  menu: '',
  activeMenu: '',
  heading: '',
  date: '',
  columns: '',
  rows: [],
  fields: [],
  buttons: [],
  msgSuccess: '',
  msgError: '',
  msgConfirm: '',
  txTitle: '',
  txChips: [],
  txNote: '',
  codeEnabled: false,
  codeFile: '',
  codeCode: '',
  steps: '[]',
};

const cadastroSteps: SimSpec['steps'] = JSON.stringify(
  [
    { wait: 500, valid: true },
    { wait: 900, press: 'Salvar', state: 'gravando…', stateTone: 'begin' },
    { wait: 800, state: 'gravado ✓', stateTone: 'ok', chips: ['ok'] },
    { wait: 400, message: 'success' },
  ],
  null,
  2
);

export const SimPackage: PackageDef<SimSpec> = {
  id: 'sim',
  name: 'Tela simulada',
  version: '3.0.0',
  icon: 'monitor-play',
  category: 'Simulação',
  author: 'Dialcron',
  description:
    'Janela de qualquer aplicativo, montada por partes: lateral, tabela, formulário, lista de tarefas, resumo, diálogos, avisos e painel inferior. Um roteiro anima tudo, sozinho ou acompanhando o código digitado.',
  defaults: simDefaults,
  box: { w: 1680, h: 780 },
  presets: [
    {
      name: 'Tabela + formulário + código',
      desc: 'Exemplo completo: o código é digitado e a tela reage (validação, gravação, falha e rollback).',
      spec: { ...simDefaults },
    },
    {
      name: 'Formulário com validação',
      desc: 'Tela sem código: valida, grava e confirma.',
      spec: {
        ...emptyScreen,
        appName: 'Cadastro',
        logoText: 'C',
        subtitle: 'Cadastro de clientes',
        menu: 'Clientes; Serviços; Agenda',
        activeMenu: 'Clientes',
        heading: 'Clientes',
        date: 'Novos cadastros',
        tableTitle: 'Clientes',
        columns: 'Nome; Telefone; Situação',
        statusColumn: 2,
        rows: [
          { cells: ['Marina Souza', '(11) 98888-1010', 'Ativo'], tone: 'ok' },
          { cells: ['Paulo Lima', '(11) 97777-2020', 'Pendente'], tone: 'warn' },
        ],
        formTitle: 'Novo cliente',
        validText: '✓ formulário válido',
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
        msgSuccess: 'Cliente cadastrado com sucesso.',
        txTitle: 'BANCO · CADASTRO',
        txState: 'gravado ✓',
        txChips: [{ table: 'cliente', detail: 'Id gerado' }],
        steps: cadastroSteps,
      },
    },
    {
      name: 'Lista de tarefas',
      desc: 'Testes ou passos de um pipeline: cada item roda e fica verde, e o resumo conta até o total.',
      spec: {
        ...emptyScreen,
        width: 900,
        appName: 'Gerenciador de Testes',
        sideShow: false,
        listTitle: 'Testes de cadastro',
        listSub: '4 testes',
        listAction: 'Executar',
        items: [
          { label: 'cria_registro_valido' },
          { label: 'rejeita_campo_vazio' },
          { label: 'atualiza_registro' },
          { label: 'remove_registro' },
        ],
        sumValue: '4',
        sumLabel: 'testes aprovados',
        sumSub: '0 falhas',
        steps: JSON.stringify(taskListSteps, null, 2),
      },
    },
    {
      name: 'Aviso flutuante com cursor',
      desc: 'Aviso do sistema com o cursor entrando, clicando na notificação e fechando.',
      spec: {
        ...emptyScreen,
        appName: 'Backup',
        logoText: 'B',
        subtitle: 'Serviço de backup',
        menu: 'Backup; Restauração; Histórico',
        activeMenu: 'Backup',
        heading: 'Backup',
        date: 'Hoje, 14:32',
        tableTitle: 'Pastas',
        columns: 'Arquivo; Pasta; Situação',
        statusColumn: 2,
        rows: [
          { cells: ['Documentos', 'Usuário', 'Concluído'], tone: 'ok' },
          { cells: ['Fotos', 'Usuário', 'Concluído'], tone: 'ok' },
          { cells: ['Projetos', 'Usuário', 'Em andamento'], tone: 'warn' },
        ],
        formTitle: 'Último backup',
        fields: [
          { label: 'Data', value: 'Hoje, 14:30' },
          { label: 'Destino', value: 'Nuvem' },
          { label: 'Tamanho', value: '3,2 GB' },
          { label: 'Arquivos', value: '12.481' },
        ],
        buttons: [
          { label: 'Backup agora', tone: 'primary' },
          { label: 'Configurações', tone: 'secondary' },
        ],
        toasts: [
          {
            id: 'backup',
            app: 'Backup',
            title: 'Backup concluído',
            body: 'Seus arquivos foram salvos na nuvem.',
            tone: 'success',
            time: 'agora',
            action: 'Abrir local',
            visible: true,
            autoHide: 0,
          },
        ],
        cursorVisible: true,
        cursorX: 84,
        cursorY: 72,
        cursorSize: 26,
        cursorTrail: true,
        steps: JSON.stringify(windowsToastSteps, null, 2),
      },
    },
  ],
  form: simForm,
  css: simCss,
  render: (spec, h) => <SimRenderer spec={spec} h={h} />,
  runtime: simRuntime,
  duration: (spec) => {
    const steps = normalizeSteps(spec.steps);
    const chars = codeWindowsOf(spec).reduce((total, win) => total + win.code.length, 0);
    const typing =
      spec.codeTyping && chars ? (chars / Math.max(10, spec.codeCps)) * 1000 + spec.codeDelay : 0;
    const items = Array.isArray(spec.items) ? spec.items.length : 0;
    const waits = steps.reduce(
      (total, step) =>
        total +
        (step.wait ?? 0) +
        (step.cursor?.duration ?? 0) +
        (step.runItems ?? 0) * items +
        (step.count ?? 0),
      0
    );
    return Math.round(typing + waits + 1500);
  },
};
