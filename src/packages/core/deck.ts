import { customAlphabet } from 'nanoid';

import type { Deck, Slide } from './types';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export const newSlideId = (): string => `s-${nanoid()}`;

/** Slide de capa padrão (mesma estrutura do template original). */
export const DEFAULT_COVER_HTML = `<section class="slide dark cover" data-notes="">
  <div class="cover-glow"></div>
  <div class="cover-left" style="top:300px">
    <div class="eyebrow">SUBTÍTULO</div>
    <h1 class="display">Título <span class="ital">principal</span></h1>
    <div class="cover-rule"></div>
    <p class="lead">Escreva aqui uma frase de apoio.</p>
  </div>
  {FOOT}
</section>`;

/** Slide de título + texto. */
export const DEFAULT_TEXT_HTML = `<section class="slide dark" data-notes="">
  <div class="eyebrow">SEÇÃO</div>
  <h2 class="title">Título do slide</h2>
  <div class="content">
    <p class="lead" style="max-width:1400px">Escreva aqui o texto do slide. Dê dois cliques para editar.</p>
  </div>
  {FOOT}
</section>`;

export const FOOTER_HTML =
  '<div class="foot"><div class="foot-l"><span class="dot"></span>MASTERMIND &nbsp;·&nbsp; APRESENTAÇÃO</div><div class="foot-r">00 <span>/ 00</span></div></div>';

/** Substitui `{FOOT}` pelo rodapé padrão. */
export function withFooter(html: string, footer = FOOTER_HTML): string {
  return html.replace(/\{FOOT\}/g, footer);
}

export function makeSlide(html: string, footer = FOOTER_HTML): Slide {
  return { id: newSlideId(), html: withFooter(html, footer) };
}

/** Deck inicial usado quando não há nada salvo. */
export function createDefaultDeck(): Deck {
  const cover = makeSlide(DEFAULT_COVER_HTML);
  const text = makeSlide(DEFAULT_TEXT_HTML);
  return { title: 'Apresentação sem título', slides: [cover, text] };
}

/** Renumera os rodapés (`00 / 00`) de todos os slides. */
export function renumberFooters(slides: Slide[]): Slide[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  return slides.map((slide, index) => {
    const html = slide.html.replace(
      /<div class="foot-r">[^<]*(?:<span>[^<]*<\/span>)?<\/div>/,
      `<div class="foot-r">${pad(index + 1)} <span>/ ${pad(slides.length)}</span></div>`
    );
    return { id: slide.id, html };
  });
}

/** Extrai o título legível de um slide (para a lista lateral). */
export function slideTitle(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const el = doc.querySelector('.display, .title, h1, h2');
  if (el) {
    el.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  const eyebrow = doc.querySelector('.eyebrow')?.textContent?.replace(/\s+/g, ' ').trim();
  return eyebrow || 'Slide sem título';
}

/** Extrai as notas do apresentador (`data-notes`), já sem escapes HTML. */
export function slideNotes(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.firstElementChild?.getAttribute('data-notes') ?? '';
}

/* -------------------------------------------------------------------------- */
/* Modelos de slide (paridade com o editor original)                          */
/* -------------------------------------------------------------------------- */

export type SlideTemplateKind =
  | 'cover'
  | 'text'
  | 'bullets'
  | 'two'
  | 'stats'
  | 'blankDark'
  | 'blankLight';

const CHECK_SVG =
  '<svg class="ic" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const bulletItems = (): string =>
  [1, 2, 3]
    .map(
      (n) =>
        `<li><span class="tick">${CHECK_SVG}</span><div><b>Tópico ${n}</b><p>Descrição curta do tópico.</p></div></li>`
    )
    .join('');

const statItems = (): string =>
  [1, 2, 3]
    .map(
      () =>
        '<div class="stat"><div class="stat-n">00</div><div class="stat-t">rótulo</div><p>Descrição curta do número.</p></div>'
    )
    .join('');

export const SLIDE_TEMPLATES: Record<SlideTemplateKind, { name: string; html: () => string }> = {
  cover: { name: 'Capa', html: () => DEFAULT_COVER_HTML },
  text: { name: 'Título + texto', html: () => DEFAULT_TEXT_HTML },
  bullets: {
    name: 'Título + tópicos',
    html: () =>
      `<section class="slide light" data-notes=""><div class="eyebrow">SEÇÃO</div><h2 class="title">Título do slide</h2><div class="content"><ul class="ticks" style="margin-top:0">${bulletItems()}</ul></div>{FOOT}</section>`,
  },
  two: {
    name: 'Duas colunas',
    html: () =>
      '<section class="slide light" data-notes=""><div class="eyebrow">SEÇÃO</div><h2 class="title">Título do slide</h2><div class="content"><div class="two-col"><div><p class="lead dark-lead">Texto da coluna da esquerda.</p></div><div class="panel"><div class="panel-label">DESTAQUE</div><p style="margin:0;font-size:24px;line-height:1.5">Conteúdo do painel da direita.</p></div></div></div>{FOOT}</section>',
  },
  stats: {
    name: 'Números',
    html: () =>
      `<section class="slide dark" data-notes=""><div class="eyebrow">NÚMEROS</div><h2 class="title">Título do slide</h2><div class="content"><div class="stats" style="grid-template-columns:repeat(3,1fr)">${statItems()}</div></div>{FOOT}</section>`,
  },
  blankDark: {
    name: 'Em branco (escuro)',
    html: () => '<section class="slide dark" data-notes="">{FOOT}</section>',
  },
  blankLight: {
    name: 'Em branco (claro)',
    html: () => '<section class="slide light" data-notes="">{FOOT}</section>',
  },
};

export function slideTemplateHTML(kind: SlideTemplateKind): string {
  return SLIDE_TEMPLATES[kind].html();
}

/** Troca `dark`/`light` na `<section>` do slide, preservando as demais classes. */
export function withSlideClass(html: string, theme: 'dark' | 'light'): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const section = doc.body.firstElementChild;
  if (!section) return html;
  section.classList.remove('dark', 'light');
  section.classList.add(theme);
  return section.outerHTML;
}

/** Aplica (ou remove) o `background` inline da `<section>` do slide. */
export function withSlideBackground(html: string, background: string | null): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const section = doc.body.firstElementChild as HTMLElement | null;
  if (!section) return html;
  if (background) section.style.setProperty('background', background);
  else section.style.removeProperty('background');
  if (!section.getAttribute('style')) section.removeAttribute('style');
  return section.outerHTML;
}

/** Tema atual do slide. */
export function slideTheme(html: string): 'dark' | 'light' {
  return /<section[^>]*class="[^"]*\blight\b/.test(html) ? 'light' : 'dark';
}

/** Fundo inline do slide (`''` quando segue o tema). */
export function slideBackground(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const section = doc.body.firstElementChild as HTMLElement | null;
  return section?.style.getPropertyValue('background') ?? '';
}
