// packages/core/bases.ts
// Slides base: definem o fundo (cor, luzes, marca d'água, contador) dos slides que os usam.
// A base fica em `deck.bases`; cada slide aponta para ela com `data-base="<id>"`.
// No editor e na apresentação a base é injetada como uma camada (`.mm-bgl`) no fim do slide.
import { newSlideId } from './deck';
import type { Deck, Slide } from './types';

const SECTION_OPEN = /^\s*<section([^>]*)>/;
const COUNTER = /(<div class="foot-r[^"]*"[^>]*>)[^<]*(?:<span>[^<]*<\/span>)?<\/div>/g;

function attr(attrs: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
  return match ? (match[1] ?? '') : null;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Id da base usada pelo slide normal (`null` quando o slide não usa base). */
export function slideBaseId(html: string): string | null {
  const open = SECTION_OPEN.exec(html);
  return open ? attr(open[1] ?? '', 'data-base') : null;
}

/** Id próprio de um slide base (`null` para slides normais). */
export function baseOwnId(html: string): string | null {
  const open = SECTION_OPEN.exec(html);
  return open ? attr(open[1] ?? '', 'data-base-id') : null;
}

export function baseName(html: string): string {
  const open = SECTION_OPEN.exec(html);
  return (open ? attr(open[1] ?? '', 'data-base-name') : null) || 'Base';
}

function setAttr(html: string, name: string, value: string | null): string {
  const open = SECTION_OPEN.exec(html);
  if (!open) return html;
  const attrs = open[1] ?? '';
  const cleaned = attrs.replace(new RegExp(`\\s${name}="[^"]*"`), '');
  const next = value === null ? cleaned : `${cleaned} ${name}="${escapeAttr(value)}"`;
  return html.replace(SECTION_OPEN, `<section${next}>`);
}

/** Aponta o slide para uma base (ou remove com `null`). */
export function withSlideBaseId(html: string, id: string | null): string {
  return setAttr(html, 'data-base', id);
}

export function withBaseName(html: string, name: string): string {
  return setAttr(html, 'data-base-name', name.trim() || 'Base');
}

/** Remove as camadas de base injetadas (usado antes de guardar/importar um slide). */
export function stripBaseLayer(html: string): string {
  if (!html.includes('mm-bgl')) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const section = doc.body.firstElementChild;
  if (!section) return html;
  section.querySelectorAll(':scope > .mm-bgl').forEach((node) => node.remove());
  return section.outerHTML;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Injeta a camada da base no slide: a base manda no tema e no fundo. */
export function applyBase(
  html: string,
  base: Slide | undefined,
  index: number,
  total: number
): string {
  const open = SECTION_OPEN.exec(html);
  const baseOpen = base ? SECTION_OPEN.exec(base.html) : null;
  if (!open || !base || !baseOpen) return html;
  const end = base.html.lastIndexOf('</section>');
  if (end < 0) return html;

  const baseAttrs = baseOpen[1] ?? '';
  const inner = base.html
    .slice(baseOpen[0].length, end)
    .replace(COUNTER, `$1${pad(index + 1)} <span>/ ${pad(total)}</span></div>`);
  const classes = (attr(baseAttrs, 'class') ?? '')
    .split(/\s+/)
    .filter((c) => c && c !== 'slide' && c !== 'active' && c !== 'mm-static');
  const style = attr(baseAttrs, 'style');
  const layer = `<div class="mm-bgl ${classes.join(' ')}"${attr(baseAttrs, 'data-fx') ? ' data-fx="1"' : ''}${style ? ` style="${style}"` : ''} aria-hidden="true">${inner}</div>`;

  const theme = classes.includes('light') ? 'light' : 'dark';
  const slideClass = (attr(open[1] ?? '', 'class') ?? 'slide')
    .split(/\s+/)
    .filter((c) => c && c !== 'dark' && c !== 'light');
  const withClass = setAttr(html, 'class', [...slideClass, theme].join(' '));
  const close = withClass.lastIndexOf('</section>');
  if (close < 0) return html;
  return withClass.slice(0, close) + layer + withClass.slice(close);
}

/** HTML dos slides já com a base aplicada (para o editor e para a apresentação). */
export function resolveDeckSlides(deck: Deck): string[] {
  const bases = deck.bases ?? [];
  return deck.slides.map((slide, index) => {
    const id = slideBaseId(slide.html);
    const base = id ? bases.find((b) => baseOwnId(b.html) === id) : undefined;
    // Base inexistente: sem `data-base`, para o CSS não anular o fundo do próprio slide.
    return base
      ? applyBase(slide.html, base, index, deck.slides.length)
      : id
        ? withSlideBaseId(slide.html, null)
        : slide.html;
  });
}

/** Slides (por índice) que usam a base `id`. */
export function slidesUsingBase(deck: Deck, id: string): number[] {
  const out: number[] = [];
  deck.slides.forEach((slide, index) => {
    if (slideBaseId(slide.html) === id) out.push(index);
  });
  return out;
}

/** Índice (na lista unificada slides + bases) da base usada pelo slide `index`, se houver. */
export function baseIndexForSlide(deck: Deck, index: number): number | null {
  const slide = deck.slides[index];
  if (!slide) return null;
  const id = slideBaseId(slide.html);
  if (!id) return null;
  const k = (deck.bases ?? []).findIndex((b) => baseOwnId(b.html) === id);
  return k < 0 ? null : deck.slides.length + k;
}

/* ---------- bases padrão ---------- */

const COUNTER_HTML =
  '<div class="foot"><div class="foot-l"><span class="dot"></span>MASTERMIND &nbsp;·&nbsp; APRESENTAÇÃO</div><div class="foot-r">00 <span>/ 00</span></div></div>';

const FX_STYLE = 'position:absolute;pointer-events:auto;z-index:0;';
const fx = (css: string, extra = ''): string =>
  `<div class="ed-obj ed-shape"${extra} style="${FX_STYLE}${css}"></div>`;

/** Marca d'água e luzes do tema como elementos reais (selecionáveis, editáveis, apagáveis). */
export function baseFxHTML(theme: 'dark' | 'light'): string {
  const watermark = fx(
    `right:-70px;bottom:-110px;width:820px;height:820px;background:var(--wm) center/contain no-repeat;opacity:${theme === 'dark' ? '.085' : '.075'};${theme === 'dark' ? 'filter:brightness(2.1) saturate(1.1);' : ''}`
  );
  if (theme === 'light') {
    return (
      fx(
        'right:-260px;top:-300px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(199,124,138,.16),transparent 65%)'
      ) + watermark
    );
  }
  return (
    fx(
      'left:936px;top:-345px;width:1200px;height:820px;background:radial-gradient(closest-side,rgba(199,124,138,.28),transparent 100%)'
    ) +
    fx(
      'left:-335px;top:687px;width:900px;height:700px;background:radial-gradient(closest-side,rgba(247,217,139,.10),transparent 100%)'
    ) +
    watermark
  );
}

const BASE_BG = {
  dark: 'linear-gradient(150deg,#411725 0%,#2A0E1A 52%,#1B0810 100%)',
  light: 'linear-gradient(155deg,#FFF8F5 0%,#FCF0EC 55%,#F6E4E0 100%)',
};

export function makeBase(
  id: string,
  name: string,
  theme: 'dark' | 'light',
  extra?: string,
  style?: string
): Slide {
  const content = extra ?? baseFxHTML(theme) + COUNTER_HTML;
  const css = style ?? `background:${BASE_BG[theme]}`;
  return {
    id: newSlideId(),
    html: `<section class="slide ${theme}" data-base-id="${id}" data-base-name="${escapeAttr(name)}" data-fx="1" style="${css}">${content}</section>`,
  };
}

/** Bases antigas (fundo só em CSS) ganham a marca d'água e as luzes como elementos editáveis. */
export function upgradeBase(base: Slide): Slide {
  if (base.html.includes('data-fx=')) return base;
  const open = SECTION_OPEN.exec(base.html);
  if (!open) return base;
  const attrs = open[1] ?? '';
  const theme = /light/.test(attr(attrs, 'class') ?? '') ? 'light' : 'dark';
  const hasBg = /background/.test(attr(attrs, 'style') ?? '');
  const style = hasBg ? attr(attrs, 'style') : `background:${BASE_BG[theme]}`;
  const withoutStyle = attrs.replace(/\sstyle="[^"]*"/, '');
  const head = `<section${withoutStyle} data-fx="1" style="${style ?? ''}">`;
  return { ...base, html: head + baseFxHTML(theme) + base.html.slice(open[0].length) };
}

export const newBaseId = (): string => `base-${newSlideId().slice(2, 8)}`;
