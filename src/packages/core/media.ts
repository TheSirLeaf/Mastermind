import type { Deck, Slide } from './types';

/**
 * Mídias embutidas nos slides (`data:...;base64,...`) separadas do HTML.
 *
 * Um vídeo de 40 MB vira ~53 MB de texto dentro do slide. Cada edição nesse slide gera uma
 * string nova com o vídeo inteiro: no histórico (80 passos), no rascunho e nas Recentes isso
 * se multiplicava. O `MediaPool` troca cada mídia por uma referência curta (`<prefixo><nome>`)
 * e guarda o conteúdo uma vez só; `unpack` devolve o HTML original.
 */

/** Referência usada no histórico e no IndexedDB. */
export const MEDIA_REF = 'mmmedia:';

/** Mídia embutida no HTML (`src="data:..."`, `url(data:...)`). */
const DATA_URL = /data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})/gi;
/** Abaixo disso não compensa separar (ícones minúsculos ficam no HTML). */
export const MIN_MEDIA_CHARS = 512;

export const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
};
export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime])
);

/**
 * Hash FNV-1a de amostras do conteúdo (começo, meio e fim) + tamanho: rápido mesmo para
 * vídeos grandes. Colisões são resolvidas comparando o conteúdo inteiro no `MediaPool`.
 */
function sampleHash(text: string): string {
  const SAMPLE = 4096;
  let h = 0x811c9dc5;
  const mix = (from: number) => {
    const end = Math.min(text.length, from + SAMPLE);
    for (let i = Math.max(0, from); i < end; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  };
  mix(0);
  if (text.length > SAMPLE) {
    mix((text.length >> 1) - (SAMPLE >> 1));
    mix(text.length - SAMPLE);
  }
  return `${(h >>> 0).toString(16).padStart(8, '0')}${text.length.toString(36)}`;
}

export interface PooledMedia {
  mime: string;
  /** Conteúdo em base64 (sem o prefixo `data:`). */
  base64: string;
}

/** Nome do arquivo `<hash>.<ext>` (o `.ext` diz o tipo ao restaurar). */
const SAFE_NAME = /^[A-Za-z0-9_-]+\.[a-z0-9]+$/;

export class MediaPool {
  private readonly items = new Map<string, PooledMedia>();

  get size(): number {
    return this.items.size;
  }

  names(): string[] {
    return [...this.items.keys()];
  }

  get(name: string): PooledMedia | undefined {
    return this.items.get(name);
  }

  /** Coloca uma mídia já separada (ex.: lida do IndexedDB ou de um arquivo). */
  set(name: string, media: PooledMedia): void {
    if (SAFE_NAME.test(name)) this.items.set(name, media);
  }

  delete(name: string): void {
    this.items.delete(name);
  }

  clear(): void {
    this.items.clear();
  }

  /** Guarda a mídia e devolve o nome (a mesma mídia sempre recebe o mesmo nome). */
  add(mime: string, base64: string): string {
    const type = mime.toLowerCase();
    const ext = EXT_BY_MIME[type] ?? 'bin';
    const base = sampleHash(base64);
    for (let n = 0; ; n += 1) {
      const name = `${base}${n ? `_${n}` : ''}.${ext}`;
      const existing = this.items.get(name);
      if (!existing) {
        this.items.set(name, { mime: type, base64 });
        return name;
      }
      if (existing.base64 === base64) return name;
    }
  }

  /** Troca as mídias do HTML por `<prefix><nome>`. */
  pack(html: string, prefix = MEDIA_REF): string {
    if (!html.includes('base64,')) return html;
    return html.replace(DATA_URL, (whole, mime: string, b64: string) =>
      b64.length < MIN_MEDIA_CHARS ? whole : `${prefix}${this.add(mime, b64)}`
    );
  }

  /** Devolve as mídias ao HTML. Referências desconhecidas ficam como estão. */
  unpack(html: string, prefix = MEDIA_REF): string {
    if (!html.includes(prefix)) return html;
    return html.replace(refPattern(prefix), (whole, name: string) => {
      const media = this.items.get(name);
      return media ? `data:${media.mime};base64,${media.base64}` : whole;
    });
  }
}

const patterns = new Map<string, RegExp>();
function refPattern(prefix: string): RegExp {
  let re = patterns.get(prefix);
  if (!re) {
    re = new RegExp(
      `${prefix.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}([A-Za-z0-9_-]+\\.[a-z0-9]+)`,
      'g'
    );
    patterns.set(prefix, re);
  }
  return re;
}

/** Nomes das mídias referenciadas no texto. */
export function mediaRefs(text: string, prefix = MEDIA_REF): Set<string> {
  const names = new Set<string>();
  if (!text.includes(prefix)) return names;
  for (const match of text.matchAll(refPattern(prefix))) if (match[1]) names.add(match[1]);
  return names;
}

const mapSlides = (slides: Slide[], fn: (slide: Slide) => Slide): Slide[] => {
  let changed = false;
  const out = slides.map((slide) => {
    const next = fn(slide);
    if (next !== slide) changed = true;
    return next;
  });
  return changed ? (Object.freeze(out) as Slide[]) : slides;
};

/** Aplica `fn` ao HTML de todos os slides e bases (mantém os objetos que não mudaram). */
export function mapDeckHtml(deck: Deck, fn: (html: string) => string): Deck {
  const each = (slide: Slide): Slide => {
    const html = fn(slide.html);
    return html === slide.html ? slide : { ...slide, html };
  };
  const slides = mapSlides(deck.slides, each);
  const bases = deck.bases ? mapSlides(deck.bases, each) : undefined;
  if (slides === deck.slides && bases === deck.bases) return deck;
  return { ...deck, slides, ...(bases ? { bases } : {}) };
}

/**
 * Pool com memória dos slides já convertidos: slides que não mudaram (o mesmo objeto, como o
 * immer devolve) não são reprocessados, e desempacotar o que foi empacotado devolve o slide
 * original. Usado pelo histórico de desfazer.
 */
export class SlideMediaCache {
  readonly pool = new MediaPool();
  private packed = new WeakMap<Slide, Slide>();
  private unpacked = new WeakMap<Slide, Slide>();

  packSlide = (slide: Slide): Slide => {
    const cached = this.packed.get(slide);
    if (cached) return cached;
    const html = this.pool.pack(slide.html);
    const out = html === slide.html ? slide : Object.freeze({ ...slide, html });
    this.packed.set(slide, out);
    this.unpacked.set(out, slide);
    return out;
  };

  unpackSlide = (slide: Slide): Slide => {
    const cached = this.unpacked.get(slide);
    if (cached) return cached;
    const html = this.pool.unpack(slide.html);
    const out = html === slide.html ? slide : Object.freeze({ ...slide, html });
    this.unpacked.set(slide, out);
    this.packed.set(out, slide);
    return out;
  };

  packDeck(deck: Deck): Deck {
    return this.mapDeck(deck, this.packSlide);
  }

  unpackDeck(deck: Deck): Deck {
    return this.mapDeck(deck, this.unpackSlide);
  }

  clear(): void {
    this.pool.clear();
    this.packed = new WeakMap();
    this.unpacked = new WeakMap();
  }

  private mapDeck(deck: Deck, fn: (slide: Slide) => Slide): Deck {
    const slides = mapSlides(deck.slides, fn);
    const bases = deck.bases ? mapSlides(deck.bases, fn) : undefined;
    if (slides === deck.slides && bases === deck.bases) return deck;
    return Object.freeze({ ...deck, slides, ...(bases ? { bases } : {}) });
  }
}
