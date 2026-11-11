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
  isNew?: boolean;
  highlight?: boolean;
}

export interface SimChip {
  table: string;
  detail: string;
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
  /** Linha de código (0-based) que dispara o passo. Sem `at` = após digitar. */
  at?: number;
  /** Espera antes de aplicar o passo, em ms. */
  wait?: number;
  valid?: boolean;
  state?: string;
  stateTone?: 'begin' | 'ok' | 'rollback';
  press?: string;
  message?: 'success' | 'error' | 'confirm';
  hideMessage?: boolean;
  chips?: SimStepAction[];
  chipDetails?: string[];
  note?: boolean;
  rollback?: boolean;
  row?: { index: number; action: 'show' | 'hide' | 'highlight' | 'clear' };
  cursor?: SimCursorStep;
  toast?: { id: string; action: 'show' | 'hide' | 'click' };
}

export interface SimSpec extends PackageSpec {
  width: number;
  appName: string;
  subtitle: string;
  /** Itens do menu separados por `;`. */
  menu: string;
  activeMenu: string;
  heading: string;
  date: string;
  /** Colunas da tabela separadas por `;`. */
  columns: string;
  statusColumn: number;
  rows: SimRow[];
  fields: SimField[];
  buttons: SimButton[];

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
  txChips: SimChip[];
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

export const simDefaults: SimSpec = {
  width: 1680,
  appName: 'Dialcron',
  subtitle: 'Sistema de agendamentos',
  menu: 'Agenda; Cadastros; Backup',
  activeMenu: 'Agenda',
  heading: 'Agenda',
  date: '09/11/2026 ▾',
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
  txChips: [
    { table: 'cad_atendimento', detail: 'Id gerado' },
    { table: 'bel_atendimento', detail: 'atendimento = Id' },
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
  steps: JSON.stringify(agendaSteps, null, 2),
};
