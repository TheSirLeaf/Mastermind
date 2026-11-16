import type { PackageSpec } from '../core/types';

export interface SimField {
  label: string;
  value: string;
}

export interface SimButton {
  label: string;
  tone?: 'primary' | 'secondary' | 'danger';
}

/** `cells` aceita array ou texto separado por `;` (formulário do Inspector). */
export interface SimRow {
  cells: string[] | string;
  tone?: 'ok' | 'warn' | 'danger';
  /** Linha que só aparece com o roteiro (`row: show`); fora da animação fica visível. */
  isNew?: boolean;
  /** Linha que sai durante o roteiro: visível no começo da animação e escondida no fim. */
  leaves?: boolean;
  highlight?: boolean;
}

export interface SimChip {
  table: string;
  detail: string;
  /** Texto da seta que liga ao item anterior (padrão `→`). */
  arrow?: string;
}

/** Item da lista de tarefas (testes, passos de um pipeline, etapas de instalação…). */
export interface SimItem {
  label: string;
}

export type SimItemStatus = 'idle' | 'run' | 'ok' | 'fail' | 'mark';

export type SimDialogKind = 'info' | 'error' | 'question' | 'file';

/** Caixa de diálogo própria, mostrada pelo roteiro com `dialog: "id"`. */
export interface SimDialog {
  id: string;
  title?: string;
  kind?: SimDialogKind;
  text?: string;
  /** Botões separados por `;` (padrão `OK`). */
  buttons?: string;
  /** Só no tipo `file`: linhas `Rótulo: valor` separadas por `;`. */
  rows?: string;
}

/** Linha da tabela do painel inferior. `start` são as células no começo da animação. */
export interface SimDbRow {
  cells: string[] | string;
  start?: string[] | string;
  highlight?: boolean;
}

/** Janela de código extra (a principal usa os campos `code*`). */
export interface SimCodeWindow {
  file: string;
  tag?: string;
  lang?: string;
  code: string;
}

export type SimStepAction = 'ok' | 'fail' | 'undo' | 'pending';

export type SimToastTone = 'info' | 'success' | 'error' | 'warning';

export interface SimToast {
  id: string;
  app: string;
  title: string;
  body: string;
  /** Emoji ou letra curta no ícone do toast. */
  icon?: string;
  tone?: SimToastTone;
  time?: string;
  action?: string;
  /** Estado final estático; o runtime esconde e reexibe conforme o roteiro. */
  visible?: boolean;
  /** Auto-dismiss em ms; 0 mantém o toast na tela. */
  autoHide?: number;
}

export type SimCursorEase = 'linear' | 'easeOutCubic' | 'spring';

export interface SimCursorStep {
  x?: number;
  y?: number;
  /** `toast:id`, `button:Rótulo` ou um seletor CSS. */
  target?: string;
  duration?: number;
  ease?: SimCursorEase;
  click?: boolean;
}

export interface SimStep {
  /** Linha de código (0-based, contando todas as janelas) que dispara o passo. Sem `at` = após digitar. */
  at?: number;
  /** Espera antes de aplicar o passo, em ms. */
  wait?: number;
  valid?: boolean;
  state?: string;
  stateTone?: 'begin' | 'ok' | 'rollback' | 'idle';
  /** Rótulo de um botão (da tela, de um diálogo, da lista) ou de um item do menu lateral. */
  press?: string;
  message?: 'success' | 'error' | 'confirm';
  hideMessage?: boolean;
  chips?: SimStepAction[];
  chipDetails?: string[];
  /** `true` mostra todas as notas; um número mostra só a nota daquela posição. */
  note?: boolean | number;
  rollback?: boolean;
  /** Linha de código (0-based) marcada como erro; no rollback o padrão é a penúltima. */
  errLine?: number;
  row?: { index: number; action: 'show' | 'hide' | 'highlight' | 'select' | 'clear' };
  cursor?: SimCursorStep;
  toast?: { id: string; action: 'show' | 'hide' | 'click' };
  /** Mostra um diálogo próprio pelo id (fica aberto até `hideMessage`). */
  dialog?: string;
  /** Muda o estado de um item da lista de tarefas. */
  item?: { index: number; status: SimItemStatus };
  /** Muda o estado de todos os itens da lista. */
  items?: SimItemStatus;
  /** Roda os itens em sequência (ms por item): cada um gira e fica concluído. */
  runItems?: number;
  /** Conta o número do resumo de 0 até o valor, em ms. */
  count?: number;
  /** Troca o texto de uma célula da tabela do painel inferior. */
  cell?: { row: number; col: number; text: string; tone?: 'ok' | 'warn' | 'danger' };
}

export interface SimSpec extends PackageSpec {
  width: number;
  appName: string;
  /** Etiqueta ao lado do nome da janela (vazio esconde). */
  tagText?: string;
  /** Mostra a barra lateral (logo, subtítulo e menu). */
  sideShow?: boolean;
  /** Letras do logo (padrão: a inicial do aplicativo). */
  logoText?: string;
  /** Imagem do logo (endereço, data URI ou `var(--nome)` do tema); substitui as letras. */
  logoImage?: string;
  subtitle: string;
  /** Itens do menu separados por `;`. */
  menu: string;
  activeMenu: string;
  heading: string;
  date: string;

  /** Título do grupo da tabela. */
  tableTitle?: string;
  /** Colunas da tabela separadas por `;` (vazio esconde a tabela). */
  columns: string;
  statusColumn: number;
  rows: SimRow[];

  /** Título do grupo do formulário. */
  formTitle?: string;
  /** Selo de validação do formulário (vazio esconde). */
  validText?: string;
  fields: SimField[];
  buttons: SimButton[];
  /** Onde ficam os botões: junto do formulário ou da tabela. */
  buttonsAt?: 'form' | 'table';

  /** Lista de tarefas: testes, passos de pipeline, etapas… */
  listTitle?: string;
  listSub?: string;
  /** Botão no cabeçalho da lista (vazio esconde). */
  listAction?: string;
  items?: SimItem[];

  /** Resumo com número grande e barra (vazio esconde). */
  sumValue?: string;
  sumLabel?: string;
  sumSub?: string;

  dialogs?: SimDialog[];

  /** Avisos flutuantes no estilo Windows 11. */
  toasts: SimToast[];
  cursorVisible: boolean;
  /** Posição inicial do cursor, em % da área do aplicativo. */
  cursorX: number;
  cursorY: number;
  cursorSize: number;
  cursorTrail: boolean;

  msgSuccess: string;
  msgError: string;
  msgConfirm: string;

  txTitle: string;
  /** Estado mostrado no fim (e fora da animação). */
  txState?: string;
  txStateTone?: 'begin' | 'ok' | 'rollback' | 'idle';
  /** Estado no começo da animação. */
  txStateStart?: string;
  txChips: SimChip[];
  /** Tabela do painel inferior: colunas separadas por `;`. */
  dbColumns?: string;
  dbRows?: SimDbRow[];
  /** Notas do painel inferior, separadas por `;`. */
  txNote: string;

  codeEnabled: boolean;
  codeFile: string;
  codeTag: string;
  codeLang: string;
  codeCode: string;
  codeTyping: boolean;
  codeCps: number;
  codeDelay: number;
  codeFontSize: number;
  codeLineHeight: number;
  /** Rodapé da janela de código (vazio esconde). */
  codeNote?: string;
  /** Janelas de código extras, digitadas depois da principal. */
  codes?: SimCodeWindow[];

  /** Lista de passos ou JSON (campo `textarea` do formulário). */
  steps: SimStep[] | string;
}

/** Normaliza `steps` quando vier do formulário como texto JSON. */
export function normalizeSteps(value: SimSpec['steps'] | undefined): SimStep[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as SimStep[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Divide campos de texto separados por `;`. */
export function listOf(value: string | undefined): string[] {
  return String(value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Extrai células de uma linha, aceitando `"a; b; c"` do formulário. */
export function cellsOf(row: SimRow): string[] {
  if (Array.isArray(row.cells)) return row.cells;
  return listOf(String(row.cells ?? ''));
}

/** Textos usados quando o spec é antigo e ainda não tem o campo (mantém decks já salvos iguais). */
export const LEGACY = {
  tagText: 'SIMULAÇÃO',
  tableTitle: 'Atendimentos do dia',
  formTitle: 'Atendimento',
  validText: '✓ formulário válido',
  txState: 'COMMIT ✓',
  codeNote: 'falhou em qualquer linha da transação? nada é gravado',
} as const;

/** Valor do spec, ou o texto antigo quando o campo ainda não existe. */
export function textOf(spec: SimSpec, key: keyof typeof LEGACY): string {
  const value = spec[key];
  return typeof value === 'string' ? value : LEGACY[key];
}

/** Janelas de código na ordem em que são digitadas. */
export function codeWindowsOf(spec: SimSpec): SimCodeWindow[] {
  const out: SimCodeWindow[] = [];
  if (spec.codeEnabled) {
    out.push({ file: spec.codeFile, tag: spec.codeTag, lang: spec.codeLang, code: spec.codeCode });
  }
  for (const win of Array.isArray(spec.codes) ? spec.codes : []) {
    if (win && typeof win.code === 'string' && win.code.trim()) out.push(win);
  }
  return out;
}

/** Diálogos da tela: as três mensagens fixas mais os diálogos próprios. */
export function dialogsOf(spec: SimSpec): Required<SimDialog>[] {
  const out: Required<SimDialog>[] = [];
  const fixed: Array<[string, string, SimDialogKind, string]> = [
    ['success', spec.msgSuccess, 'info', 'OK'],
    ['error', spec.msgError, 'error', 'OK'],
    ['confirm', spec.msgConfirm, 'question', 'Sim'],
  ];
  for (const [id, text, kind, buttons] of fixed) {
    if (text) out.push({ id, title: spec.heading || spec.appName, kind, text, buttons, rows: '' });
  }
  for (const dialog of Array.isArray(spec.dialogs) ? spec.dialogs : []) {
    if (!dialog?.id) continue;
    out.push({
      id: dialog.id,
      title: dialog.title || spec.heading || spec.appName,
      kind: dialog.kind ?? 'info',
      text: dialog.text ?? '',
      buttons: dialog.buttons || 'OK',
      rows: dialog.rows ?? '',
    });
  }
  return out;
}

/** Células de uma linha do painel inferior (aceita texto separado por `;`). */
export function dbCellsOf(cells: SimDbRow['cells'] | undefined): string[] {
  if (Array.isArray(cells)) return cells;
  return listOf(String(cells ?? ''));
}

/** Aceita specs antigos sem `toasts`. */
export function toastsOf(spec: SimSpec): SimToast[] {
  return Array.isArray(spec.toasts) ? spec.toasts.filter((toast) => Boolean(toast?.id)) : [];
}

/** Configuração efetiva do cursor, com defaults para specs antigos. */
export function cursorOf(spec: SimSpec): {
  visible: boolean;
  x: number;
  y: number;
  size: number;
  trail: boolean;
} {
  return {
    visible: spec.cursorVisible === true,
    x: Number.isFinite(spec.cursorX) ? spec.cursorX : 82,
    y: Number.isFinite(spec.cursorY) ? spec.cursorY : 68,
    size: Number.isFinite(spec.cursorSize) ? spec.cursorSize : 26,
    trail: spec.cursorTrail === true,
  };
}

export const agendaSteps: SimStep[] = [
  { at: 0, wait: 350, valid: true },
  { at: 1, wait: 250, state: 'conexão aberta', stateTone: 'begin' },
  { at: 2, wait: 200, state: 'BEGIN', stateTone: 'begin' },
  { at: 4, wait: 200, chips: ['ok', 'pending', 'pending'] },
  { at: 5, wait: 200, chips: ['ok', 'ok', 'pending'] },
  { at: 6, wait: 200, chips: ['ok', 'ok', 'ok'] },
  { at: 8, wait: 300, state: 'COMMIT ✓', stateTone: 'ok' },
  { at: 8, wait: 300, press: 'Salvar', row: { index: 2, action: 'show' } },
  { at: 9, wait: 300, message: 'success' },
  { wait: 3600, note: true },
  {
    wait: 1400,
    rollback: true,
    state: 'ROLLBACK ↩',
    stateTone: 'rollback',
    chips: ['undo', 'undo', 'fail'],
    chipDetails: ['desfeito', 'desfeito', 'falhou'],
    row: { index: 2, action: 'hide' },
  },
  { wait: 500, message: 'error' },
];

export const successSteps: SimStep[] = [
  { at: 0, wait: 350, valid: true },
  { at: 2, wait: 200, state: 'BEGIN', stateTone: 'begin' },
  { at: 4, wait: 200, chips: ['ok', 'pending', 'pending'] },
  { at: 5, wait: 200, chips: ['ok', 'ok', 'pending'] },
  { at: 6, wait: 200, chips: ['ok', 'ok', 'ok'] },
  { at: 8, wait: 300, state: 'COMMIT ✓', stateTone: 'ok' },
  { at: 8, wait: 300, press: 'Salvar', row: { index: 2, action: 'show' } },
  { at: 9, wait: 300, message: 'success' },
];

export const windowsToastSteps: SimStep[] = [
  { wait: 700, toast: { id: 'backup', action: 'show' } },
  {
    wait: 500,
    cursor: { target: 'toast:backup', duration: 650, ease: 'spring', click: true },
  },
  { wait: 300, toast: { id: 'backup', action: 'click' } },
  { wait: 1000, toast: { id: 'backup', action: 'hide' } },
];

/** Roteiro de uma lista de tarefas: aperta o botão, roda os itens e conta o resumo. */
export const taskListSteps: SimStep[] = [
  { wait: 700, press: 'Executar' },
  { wait: 450, runItems: 320 },
  { wait: 100, count: 1400 },
];

/** Campos das partes novas, vazios: base para presets e para o exemplo padrão. */
export const simBlank = {
  tagText: 'SIMULAÇÃO',
  sideShow: true,
  logoText: '',
  logoImage: '',
  tableTitle: '',
  formTitle: '',
  validText: '',
  buttonsAt: 'form' as const,
  listTitle: '',
  listSub: '',
  listAction: '',
  items: [] as SimItem[],
  sumValue: '',
  sumLabel: '',
  sumSub: '',
  dialogs: [] as SimDialog[],
  txState: '',
  txStateTone: 'ok' as const,
  txStateStart: '—',
  dbColumns: '',
  dbRows: [] as SimDbRow[],
  codeNote: '',
  codes: [] as SimCodeWindow[],
};

export const simDefaults: SimSpec = {
  ...simBlank,
  width: 1680,
  appName: 'Dialcron',
  logoText: 'D',
  subtitle: 'Sistema de agendamentos',
  menu: 'Agenda; Cadastros; Backup',
  activeMenu: 'Agenda',
  heading: 'Agenda',
  date: '09/11/2026 ▾',
  tableTitle: 'Atendimentos do dia',
  columns: 'Data e horário; Cliente; Profissional; Situação; Valor',
  statusColumn: 3,
  rows: [
    {
      cells: ['09:00', 'Paulo Lima', 'Camila Rocha', 'Confirmado', 'R$ 60,00'],
      tone: 'ok',
    },
    {
      cells: ['11:30', 'Ana Beatriz', 'Rafael Souza', 'Agendado', 'R$ 90,00'],
      tone: 'warn',
    },
    {
      cells: ['14:00', 'Marina Souza', 'Camila Rocha', 'Agendado', 'R$ 150,00'],
      tone: 'warn',
      isNew: true,
    },
  ],
  formTitle: 'Atendimento',
  validText: '✓ formulário válido',
  fields: [
    { label: 'Unidade', value: 'Dialcron Centro' },
    { label: 'Cliente', value: 'Marina Souza' },
    { label: 'Profissional', value: 'Camila Rocha' },
    { label: 'Data e horário', value: '09/11/2026 14:00' },
    { label: 'Serviços', value: 'Corte, Escova' },
    { label: 'Valor', value: 'R$ 150,00' },
  ],
  buttons: [
    { label: 'Novo', tone: 'secondary' },
    { label: 'Salvar', tone: 'primary' },
    { label: 'Excluir', tone: 'secondary' },
  ],
  toasts: [],
  cursorVisible: false,
  cursorX: 82,
  cursorY: 68,
  cursorSize: 26,
  cursorTrail: false,
  msgSuccess: 'Atendimento cadastrado com sucesso.',
  msgError: 'Não foi possível salvar o atendimento: falha simulada.',
  msgConfirm: 'Confirmar a exclusão do atendimento?',
  txTitle: 'BANCO · TRANSAÇÃO SQLITE',
  txState: 'COMMIT ✓',
  txChips: [
    { table: 'cad_atendimento', detail: 'Id gerado' },
    { table: 'bel_atendimento', detail: 'atendimento = Id', arrow: 'FK →' },
    { table: 'bel_atendimento_servico', detail: '2 serviços' },
  ],
  txNote: '↻ e se a última etapa falhar?',
  codeEnabled: true,
  codeFile: 'Controls/AgendaUC.cs',
  codeTag: 'C#',
  codeLang: 'csharp',
  codeCode: [
    'if (!ValidarFormulario()) return;',
    'var conexao = await Database.Instance.InitializeAsync();',
    'await conexao.RunInTransactionAsync(tx =>',
    '{',
    '    tx.Insert(novo.Cadastro);',
    '    novo.Belo.Atendimento = novo.Cadastro.Id;',
    '    tx.Insert(novo.Belo);',
    '    InserirServicos(tx, novo);',
    '});',
    'await FiltrarPorDiaAsync(dtpDataAgenda.Value.Date);',
  ].join('\n'),
  codeTyping: true,
  codeCps: 70,
  codeDelay: 700,
  codeFontSize: 17,
  codeLineHeight: 1.62,
  codeNote: 'falhou em qualquer linha da transação? nada é gravado',
  steps: JSON.stringify(agendaSteps, null, 2),
};
