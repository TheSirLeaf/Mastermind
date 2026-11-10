import type { HelperAPI } from './types';

/** Escapa caracteres HTML. */
export const esc = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Converte números em formato pt-BR (aceita vírgula ou ponto). */
export const num = (s: unknown): number => {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  if (s === null || s === undefined) return 0;
  const cleaned = String(s)
    .replace(/\s/g, '')
    .replace(/\./g, (dot, _offset, whole) => (whole.includes(',') ? '' : dot))
    .replace(',', '.')
    .replace(/[^0-9.+-]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

/** Formata em pt-BR com `d` casas decimais. */
export const fmt = (v: number, d = 0): string => {
  const n = Number.isFinite(v) ? v : 0;
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};

/** `"2, 4-6"` → `{2:true, 4:true, 5:true, 6:true}`. */
export const range = (s: string): Record<number, true> => {
  const out: Record<number, true> = {};
  for (const part of String(s).split(',')) {
    const piece = part.trim();
    if (!piece) continue;
    const m = piece.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out[i] = true;
      continue;
    }
    const n = Number(piece);
    if (Number.isInteger(n) && n > 0) out[n] = true;
  }
  return out;
};

/* -------------------------------------------------------------------------- */
/* Realce de sintaxe                                                          */
/* -------------------------------------------------------------------------- */

const KEYWORDS: Record<string, Set<string>> = {
  csharp: new Set(
    'abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while yield'.split(
      ' '
    )
  ),
  js: new Set(
    'async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while yield true false null undefined'.split(
      ' '
    )
  ),
  py: new Set(
    'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield'.split(
      ' '
    )
  ),
  sql: new Set(
    'select from where join left right inner outer on as and or not null insert into values update set delete create table primary key foreign references order by group having limit offset distinct count sum avg min max case when then else end'.split(
      ' '
    )
  ),
  yaml: new Set('true false null yes no on off'.split(' ')),
  json: new Set('true false null'.split(' ')),
  text: new Set(),
};

const LINE_COMMENT: Record<string, RegExp> = {
  csharp: /^\/\/.*/,
  js: /^\/\/.*/,
  py: /^#.*/,
  sql: /^--.*/,
  yaml: /^#.*/,
};

const escape = esc;

function tokenizeLine(line: string, lang: string, prefix: string): string {
  const kw = KEYWORDS[lang] ?? KEYWORDS.text;
  const span = (cls: string, text: string) =>
    text ? `<span class="${prefix}${cls}">${escape(text)}</span>` : '';
  let out = '';
  let i = 0;

  if (lang === 'yaml') {
    const m = line.match(/^(\s*-?\s*)([\w./-]+)(:)(\s|$)/);
    if (m && m[2] !== undefined) {
      out += escape(m[1] ?? '') + span('kw', m[2]) + escape(':');
      i = m[0].length - (m[4] ?? '').length;
    }
  }

  while (i < line.length) {
    const rest = line.slice(i);
    const c = line.charAt(i);
    const lineComment = LINE_COMMENT[lang];
    if (lineComment) {
      const cm = rest.match(lineComment);
      if (cm) {
        out += span('cm', cm[0]);
        break;
      }
    }
    if (lang !== 'text' && rest.startsWith('/*')) {
      const end = rest.indexOf('*/');
      const block = end >= 0 ? rest.slice(0, end + 2) : rest;
      out += span('cm', block);
      i += block.length;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const strRe =
        c === '"'
          ? /^"(?:\\.|[^"\\])*"?/
          : c === "'"
            ? /^'(?:\\.|[^'\\])*'?/
            : /^`(?:\\.|[^`\\])*`?/;
      const m = rest.match(strRe);
      const text = m?.[0] ?? c;
      const isKey = lang === 'json' && /^\s*:/.test(rest.slice(text.length));
      out += span(isKey ? 'kw' : 'str', text);
      i += text.length;
      continue;
    }
    if (/\d/.test(c) && !/[A-Za-z_]/.test(line.charAt(i - 1))) {
      const m = rest.match(/^\d+(?:[.,]\d+)?/) ?? [c];
      out += span('num', m[0]);
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/) ?? [c];
      const word = m[0];
      const key = lang === 'sql' ? word.toLowerCase() : word;
      const next = rest.charAt(word.length);
      if (kw?.has(key)) out += span('kw', word);
      else if (next === '(' && lang !== 'yaml' && lang !== 'json') out += span('fn', word);
      else if (lang === 'csharp' && /^[A-Z]/.test(word)) out += span('ty', word);
      else out += escape(word);
      i += word.length;
      continue;
    }
    if (lang !== 'text' && lang !== 'yaml' && /[-+*/%=<>!?:&|]/.test(c)) {
      const m = rest.match(/^[-+*/%=<>!?:&|]+/) ?? [c];
      out += span('op', m[0]);
      i += m[0].length;
      continue;
    }
    out += escape(c);
    i += 1;
  }

  return out;
}

/** Realce por linha. Retorna HTML de cada linha (sem `<pre>`). */
export const hl = (code: string, lang: string, prefix = 'tk-'): string[] =>
  String(code ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => tokenizeLine(line, lang, prefix));

export const H: HelperAPI = { esc, num, fmt, range, hl };

/** Copia profunda compatível com ambientes sem `structuredClone`. */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
