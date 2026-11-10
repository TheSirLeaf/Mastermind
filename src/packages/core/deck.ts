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

/** Extrai as notas do apresentador (`data-notes`). */
export function slideNotes(html: string): string {
  const m = html.match(/data-notes="([^"]*)"/);
  return m?.[1] ?? '';
}
