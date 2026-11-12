// packages/core/models.ts
// Modelos: conjuntos de slides base (fundos) + slides prontos que usam essas bases.
import { makeBase } from './bases';
import { DEFAULT_COVER_HTML, DEFAULT_TEXT_HTML, SLIDE_TEMPLATES, makeSlide } from './deck';
import type { Deck, Slide } from './types';

export interface ModelSlide {
  name: string;
  /** Id da base que o slide usa. */
  base: string;
  /** HTML do slide, já com `data-base`. */
  html: string;
}

export interface ModelDef {
  id: string;
  name: string;
  description: string;
  bases: () => Slide[];
  slides: ModelSlide[];
}

export const DEFAULT_MODEL_ID = 'mastermind';

const forBase = (html: string, base: string): string =>
  html.replace(/\{FOOT\}/g, '').replace(/^<section([^>]*)>/, `<section$1 data-base="${base}">`);

const mastermindSlides = (): ModelSlide[] => [
  { name: 'Capa', base: 'mm-dark', html: forBase(DEFAULT_COVER_HTML, 'mm-dark') },
  { name: 'Título + texto', base: 'mm-dark', html: forBase(DEFAULT_TEXT_HTML, 'mm-dark') },
  {
    name: 'Título + tópicos',
    base: 'mm-light',
    html: forBase(SLIDE_TEMPLATES.bullets.html(), 'mm-light'),
  },
  { name: 'Duas colunas', base: 'mm-light', html: forBase(SLIDE_TEMPLATES.two.html(), 'mm-light') },
  { name: 'Números', base: 'mm-dark', html: forBase(SLIDE_TEMPLATES.stats.html(), 'mm-dark') },
  {
    name: 'Em branco (escuro)',
    base: 'mm-dark',
    html: forBase(SLIDE_TEMPLATES.blankDark.html(), 'mm-dark'),
  },
  {
    name: 'Em branco (claro)',
    base: 'mm-light',
    html: forBase(SLIDE_TEMPLATES.blankLight.html(), 'mm-light'),
  },
];

const MINIMAL_COUNTER =
  '<div class="foot-r" style="position:absolute;right:80px;bottom:44px;font-size:20px">00 <span>/ 00</span></div>';

const minimalSlides = (): ModelSlide[] => [
  {
    name: 'Título',
    base: 'min-base',
    html: '<section class="slide dark" data-base="min-base" data-notes=""><div class="content" style="justify-content:center"><h1 class="display">Título</h1><p class="lead">Subtítulo</p></div></section>',
  },
  {
    name: 'Título + texto',
    base: 'min-base',
    html: '<section class="slide dark" data-base="min-base" data-notes=""><h2 class="title">Título do slide</h2><div class="content"><p class="lead" style="max-width:1400px">Escreva aqui o texto do slide.</p></div></section>',
  },
  {
    name: 'Em branco',
    base: 'min-base',
    html: '<section class="slide dark" data-base="min-base" data-notes=""></section>',
  },
];

/** Modelos disponíveis (função: evita avaliar os modelos antes dos módulos carregarem). */
export function getModels(): ModelDef[] {
  return [
    {
      id: DEFAULT_MODEL_ID,
      name: 'Mastermind',
      description: 'Vinho e dourado, com luzes e marca d’água. Bases escura e clara.',
      bases: () => [makeBase('mm-dark', 'Escuro', 'dark'), makeBase('mm-light', 'Claro', 'light')],
      slides: mastermindSlides(),
    },
    {
      id: 'minimal',
      name: 'Minimalista',
      description: 'Fundo liso e escuro, só com o contador de slides.',
      bases: () => [makeBase('min-base', 'Liso', 'dark', MINIMAL_COUNTER, 'background:#141417')],
      slides: minimalSlides(),
    },
  ];
}

export function getModel(id: string | undefined): ModelDef {
  const models = getModels();
  return models.find((m) => m.id === id) ?? (models[0] as ModelDef);
}

/** Garante que o deck tenha a base pedida (copiando-a do modelo quando falta). */
export function ensureBase(deck: Deck, modelId: string, baseId: string): Slide[] {
  const bases = deck.bases ?? [];
  if (bases.some((b) => b.html.includes(`data-base-id="${baseId}"`))) return bases;
  const from = getModel(modelId)
    .bases()
    .find((b) => b.html.includes(`data-base-id="${baseId}"`));
  return from ? [...bases, from] : bases;
}

/** Slide novo a partir de um slide de modelo. */
export function slideFromModel(modelSlide: ModelSlide): Slide {
  return makeSlide(modelSlide.html, '');
}
