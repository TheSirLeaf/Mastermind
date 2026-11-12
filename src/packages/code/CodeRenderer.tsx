import type { CSSProperties } from 'react';

import type { HelperAPI, PackageSpec } from '../core/types';

import { finalHighlighted } from './codeTimeline';

export interface CodeRendererProps {
  spec: CodeSpec;
  h: HelperAPI;
}

export interface CodeSpec extends PackageSpec {
  file: string;
  tag: string;
  lang: string;
  code: string;
  theme: 'dark' | 'light';
  fontSize: number;
  lineHeight: number;
  titlebar: boolean;
  note: string;
  hl: string;
  lineGlow: boolean;
  typing: boolean;
  cps: number;
  delay: number;
  caret: boolean;
  w: number;
  /** Animação: `typing` (caractere a caractere) ou `terminal` (console: linha a linha). */
  variant?: 'typing' | 'terminal';
  /** Destaques de linha: aparecem `at` segundos depois da digitação (ou do atraso, sem digitação). */
  highlights?: CodeHighlight[];
  /** Mostra a numeração das linhas. */
  lineNumbers?: boolean;
  /** Esquema de cores do bloco (`default` segue o tema escuro/claro). */
  palette?: CodePaletteId;
  cBg?: string;
  cFg?: string;
  cAc?: string;
  cKw?: string;
  cStr?: string;
  cNum?: string;
  cFn?: string;
  cCm?: string;
}

export interface CodeHighlight {
  /** Linhas, ex.: `2, 4-6`. */
  lines: string;
  /** Segundos depois do fim da digitação. */
  at: number;
  /** Mantém os destaques anteriores em vez de trocá-los. */
  keep?: boolean;
}

export type CodePaletteId = 'default' | 'slate' | 'midnight' | 'paper' | 'custom';

interface CodeColors {
  bg: string;
  fg: string;
  ac: string;
  kw: string;
  str: string;
  num: string;
  fn: string;
  cm: string;
}

/** Esquemas prontos (o `default` usa as cores do tema). */
export const CODE_PALETTES: Record<Exclude<CodePaletteId, 'default' | 'custom'>, CodeColors> = {
  slate: {
    bg: '#1F2128',
    fg: '#E6E8EE',
    ac: '#7AA2F7',
    kw: '#7AA2F7',
    str: '#9ECE6A',
    num: '#E0AF68',
    fn: '#BB9AF7',
    cm: '#6B7394',
  },
  midnight: {
    bg: '#0F1B2D',
    fg: '#DCE7F5',
    ac: '#4FC3F7',
    kw: '#4FC3F7',
    str: '#A5E075',
    num: '#FFB86C',
    fn: '#C792EA',
    cm: '#5C7391',
  },
  paper: {
    bg: '#F7F7F5',
    fg: '#2B2B2B',
    ac: '#2F6FEB',
    kw: '#C2410C',
    str: '#15803D',
    num: '#9333EA',
    fn: '#1D4ED8',
    cm: '#8A8A85',
  },
};

function paletteColors(spec: CodeSpec): CodeColors | null {
  if (!spec.palette || spec.palette === 'default') return null;
  if (spec.palette !== 'custom') return CODE_PALETTES[spec.palette] ?? null;
  const base = CODE_PALETTES.slate;
  return {
    bg: spec.cBg || base.bg,
    fg: spec.cFg || base.fg,
    ac: spec.cAc || base.ac,
    kw: spec.cKw || base.kw,
    str: spec.cStr || base.str,
    num: spec.cNum || base.num,
    fn: spec.cFn || base.fn,
    cm: spec.cCm || base.cm,
  };
}

export function CodeRenderer({ spec, h }: CodeRendererProps): JSX.Element {
  const lines = h.hl(spec.code, spec.lang, 'tk-');
  // Estado final: depois de todos os eventos (durante a animação o runtime os aplica no tempo certo).
  const highlighted = finalHighlighted(spec);
  const colors = paletteColors(spec);
  const vars = colors
    ? ({
        '--pk-bg': colors.bg,
        '--pk-fg': colors.fg,
        '--pk-ac': colors.ac,
        '--pk-kw': colors.kw,
        '--pk-str': colors.str,
        '--pk-num': colors.num,
        '--pk-fn': colors.fn,
        '--pk-cm': colors.cm,
      } as CSSProperties)
    : {};
  // O estilo visual é um só (o da apresentação); `variant` só muda a animação.
  return (
    <div
      data-testid="pk-code-container"
      className={`pk-code pk-${spec.theme} pk-v-typing${spec.lineNumbers ? ' pk-nums' : ''}${colors ? ' pk-pal' : ''}${spec.typing ? ' pk-typing' : ''}`}
      style={{ width: `${spec.w}px`, maxWidth: '100%', ...vars }}
    >
      <div className="pk-win">
        {spec.titlebar ? (
          <div data-testid="pk-titlebar" className="pk-bar">
            <span className="pk-dot" />
            <span className="pk-dot" />
            <span className="pk-dot" />
            {spec.file ? <span className="pk-file">{spec.file}</span> : null}
            {spec.tag ? <span className="pk-tag">{spec.tag}</span> : null}
          </div>
        ) : null}
        <pre
          className="pk-pre"
          style={
            {
              '--fs': `${spec.fontSize}px`,
              '--lh': String(spec.lineHeight),
            } as CSSProperties
          }
        >
          {lines.map((line, index) => (
            <span
              key={index}
              data-testid={`pk-code-line-${index + 1}`}
              className={`pk-ln${highlighted[index + 1] ? ' pk-hl' : ''}`}
              data-n={index + 1}
              dangerouslySetInnerHTML={{ __html: line || ' ' }}
            />
          ))}
        </pre>
        {spec.note ? (
          <div data-testid="pk-note" className="pk-note">
            {spec.note}
          </div>
        ) : null}
      </div>
    </div>
  );
}
