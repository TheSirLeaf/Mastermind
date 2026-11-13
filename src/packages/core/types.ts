// packages/core/types.ts
import type { ReactNode } from 'react';

/**
 * Contrato compartilhado entre Editor, Pacotes e Apresentação.
 *
 * ATENÇÃO: este arquivo é protegido pelo AGENTS_CONTRACT.md. Mudanças exigem PR
 * com aprovação de pelo menos 1 outro agente.
 */

/** Especificação livre de um pacote. Cada pacote define sua própria interface. */
export interface PackageSpec {
  [key: string]: unknown;
}

/* -------------------------------------------------------------------------- */
/* Formulário do Inspector                                                    */
/* -------------------------------------------------------------------------- */

export type ShowIfOperator = 'eq' | 'ne' | 'in';

/** Visibilidade condicional de um campo ou grupo. */
export interface ShowIf {
  k: string;
  eq?: unknown;
  ne?: unknown;
  in?: unknown[];
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'code'
  | 'number'
  | 'range'
  | 'color'
  | 'select'
  | 'toggle'
  | 'seg'
  | 'check'
  | 'list'
  | 'row'
  | 'info'
  | 'buttons';

/** Par [valor, rótulo] ou [valor, rótulo, ícone]. */
export type FormOption = [string, string] | [string, string, string];

/** Botão de ação dentro de um grupo do formulário. */
export interface FormAction {
  label: string;
  icon?: string;
  do: (spec: PackageSpec) => void;
}

export interface FormField {
  k?: string;
  type: FormFieldType;
  label?: string;
  placeholder?: string;
  help?: string;
  title?: string;
  options?: FormOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  rows?: number;
  /** Para `list`: campos de cada item. */
  item?: FormField[];
  /** Para `list`: valor de um novo item. */
  itemDefault?: Record<string, unknown>;
  /** Para `row`: campos na mesma linha. */
  fields?: FormField[];
  /** Para `buttons`. */
  items?: FormAction[];
  /** Para `info`. */
  text?: string;
  addLabel?: string;
  /** Largura no grid do formulário (ex.: `1fr`, `64px`). */
  w?: string;
  showIf?: ShowIf;
}

export interface FormGroup {
  group: string;
  icon?: string;
  open?: boolean;
  /** Onde o grupo aparece no inspetor: aba Estilo (padrão) ou Animação. */
  workspace?: 'style' | 'animation';
  showIf?: ShowIf;
  fields: FormField[];
}

export type FormSchema = FormGroup[];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Utilitários puros disponíveis para `render` e `runtime`. */
export interface HelperAPI {
  /** Escapa HTML. */
  esc: (s: string) => string;
  /** Converte um número em formato pt-BR (aceita `"90,0"` e `"90.0"`). */
  num: (s: unknown) => number;
  /** Formata um número em pt-BR com `d` casas decimais. */
  fmt: (v: number, d?: number) => string;
  /** Converte `"2, 4-6"` em um mapa `{2:true, 4:true, 5:true, 6:true}`. */
  range: (s: string) => Record<number, true>;
  /** Realce de sintaxe por linha. Retorna um array com o HTML de cada linha. */
  hl: (code: string, lang: string, prefix?: string) => string[];
}

/** API fornecida pelo host da apresentação para os runtimes de pacote. */
export interface RuntimeAPI {
  /** `prefers-reduced-motion: reduce` ativo. */
  reduced: boolean;
  /** `false` quando o slide saiu de cena. */
  alive: () => boolean;
  /** Sleep cooperativo que não continua se o slide sair de cena. */
  wait: (ms: number) => Promise<void>;
  /** Loop de animação; retornar `false` interrompe. */
  frame: (fn: (ts: number) => boolean | void) => void;
}

/** Controller devolvido por um runtime. */
export interface RuntimeController {
  play: () => void | Promise<void>;
  /** Sempre chamado na troca de slide; deve restaurar o HTML final. */
  final: () => void;
}

/* -------------------------------------------------------------------------- */
/* Pacotes                                                                    */
/* -------------------------------------------------------------------------- */

export interface Preset<TSpec extends PackageSpec = PackageSpec> {
  name: string;
  desc?: string;
  spec: Partial<TSpec>;
}

export interface BoxHint {
  w?: number;
  h?: number;
}

/** Reconhecer e atualizar elementos de apresentações legadas. */
export interface AdoptRules<TSpec extends PackageSpec = PackageSpec> {
  match(el: Element): Element | null;
  parse(root: Element, h: HelperAPI): TSpec;
  apply(root: Element, spec: TSpec, h: HelperAPI): void;
}

export type PackageRender<TSpec extends PackageSpec = PackageSpec> = (
  spec: TSpec,
  h: HelperAPI
) => ReactNode;

export type PackageRuntime<TSpec extends PackageSpec = PackageSpec> = (
  root: HTMLElement,
  spec: TSpec,
  api: RuntimeAPI
) => RuntimeController | null;

/**
 * Transição de slide oferecida por um pacote. O CSS usa as classes `.t-in` (slide que entra)
 * e `.t-out` (slide que sai), com variantes `.t-in-r`/`.t-out-r` para voltar; a duração é a da `animation`.
 */
export interface PackageTransition {
  id: string;
  name: string;
  description?: string;
  css: string;
}

/** Evento de animação de um pacote, mostrado e editável na linha do tempo (tempos em segundos). */
export interface PackageTimelineEvent {
  id: string;
  label: string;
  start: number;
  duration: number;
  color?: string;
  /** A ponta da barra altera a duração (senão só dá para mover). */
  resizable?: boolean;
}

export interface PackageTimeline<TSpec extends PackageSpec = PackageSpec> {
  /** Eventos do pacote, na ordem em que aparecem. */
  events(spec: TSpec): PackageTimelineEvent[];
  /** Devolve as mudanças do `spec` quando o evento `id` é movido (`start`) ou redimensionado (`duration`). */
  move(
    spec: TSpec,
    id: string,
    change: { start?: number; duration?: number }
  ): Partial<TSpec> | null;
}

export interface PackageDef<TSpec extends PackageSpec = PackageSpec> {
  /** kebab-case único. */
  id: string;
  name: string;
  version: string;
  /** Nome de ícone Lucide. */
  icon: string;
  author?: string;
  description?: string;
  /** Grupo no gerenciador de pacotes (ex.: Código, Dados, Simulação). */
  category?: string;
  defaults: TSpec;
  presets?: Preset<TSpec>[];
  box?: BoxHint;
  form: FormSchema;
  render(spec: TSpec, h: HelperAPI): ReactNode;
  css?: string;
  runtime?(root: HTMLElement, spec: TSpec, api: RuntimeAPI): RuntimeController | null;
  duration?(spec: TSpec): number;
  adopt?: AdoptRules<TSpec>;
  /** Transições de slide próprias do pacote (aparecem em Slide → Transição → Pacote). */
  transitions?: PackageTransition[];
  /** Eventos que aparecem na linha do tempo da aba Animação. */
  timeline?: PackageTimeline<TSpec>;
}

/** Pacote serializado: funções viram `{ $fn: "..." }`. */
export interface SerializedPackage {
  id: string;
  name: string;
  version: string;
  icon: string;
  author?: string;
  description?: string;
  category?: string;
  defaults: PackageSpec;
  presets?: Array<{ name: string; desc?: string; spec: PackageSpec }>;
  box?: BoxHint;
  form: FormSchema;
  css?: string;
  transitions?: PackageTransition[];
  /** Formato legado usado pelo editor monolítico. */
  render?: { $fn: string } | string;
  runtime?: { $fn: string } | string;
  duration?: { $fn: string } | string;
  adopt?: {
    match: { $fn: string } | string;
    parse: { $fn: string } | string;
    apply: { $fn: string } | string;
  };
}

/** Arquivo `.dialcron-pkg.json`. */
export interface PackageFile {
  format: 'dialcron-package';
  spec: 1;
  packages: SerializedPackage[];
}

export interface ImportResult {
  imported: PackageDef[];
  skipped: Array<{ id: string; name: string; reason: string }>;
}

/* -------------------------------------------------------------------------- */
/* Slides / deck                                                              */
/* -------------------------------------------------------------------------- */

export interface Slide {
  id: string;
  /** `<section class="slide ...">...</section>` — HTML completo do slide. */
  html: string;
}

export interface Deck {
  title: string;
  slides: Slide[];
  /** Slides base (fundos). Não são apresentados. */
  bases?: Slide[];
  /** Modelo de origem (ver `models.ts`). */
  modelId?: string;
  /** Preferências da apresentação (aba Slides). */
  settings?: PresentationSettings;
}

/** Como a apresentação se comporta. */
export interface PresentationSettings {
  /** Barra de progresso inferior (padrão: ligada). */
  progressBar?: boolean;
  /** `standard`: slides em sequência. `areas`: o apresentador navega livremente (em desenvolvimento). */
  mode?: 'standard' | 'areas';
  /** Interação ao vivo com a plateia (em desenvolvimento). */
  live?: boolean;
}

/** Dados de seleção reportados pelo iframe do editor. */
export interface SelectionInfo {
  path: number[];
  tag: string;
  label: string;
}
