import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';

import { collectPackageIds } from './export';
import { mapDeckHtml, MediaPool, MIME_BY_EXT } from './media';
import type { PackageRegistry } from './PackageRegistry';
import type { Deck, SerializedPackage, Slide } from './types';

/**
 * Formato de trabalho do Mastermind (`.mmdeck`): um zip com
 *
 * - `manifest.json`: formato, versão do formato, título e os pacotes usados (id → versão);
 * - `deck.json`: a apresentação (slides, bases, configurações), com as mídias trocadas por
 *   referências `mmdeck:media/<arquivo>`;
 * - `media/*`: imagens, vídeos e GIFs em binário (um arquivo por mídia, sem repetição);
 * - `packages.json`: cópia dos pacotes importados que a apresentação usa (os incluídos no
 *   editor não vão), para abrir em outro computador sem "Pacote ausente".
 *
 * O `.html` continua sendo o formato de exportação (abre em qualquer navegador).
 */
export const MMDECK_EXT = '.mmdeck';
export const MMDECK_MIME = 'application/x-mastermind-deck';
export const MMDECK_FORMAT = 'mastermind-deck';
/** Versão do formato. Subir quando o conteúdo mudar de forma incompatível (e migrar em `readDeckFile`). */
export const MMDECK_VERSION = 1;

const MEDIA_REF = 'mmdeck:media/';

export interface MmdeckManifest {
  format: typeof MMDECK_FORMAT;
  version: number;
  title: string;
  savedAt: string;
  slides: number;
  /** Pacotes usados pela apresentação (id → versão instalada ao salvar). */
  packages: Record<string, string>;
}

export interface MmdeckContents {
  manifest: MmdeckManifest;
  deck: Deck;
  /** Pacotes importados que vieram junto do arquivo. */
  packages: SerializedPackage[];
}

export class MmdeckError extends Error {}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Monta o `.mmdeck` (bytes do zip). */
export function buildDeckFile(deck: Deck, registry: PackageRegistry): Uint8Array {
  const pool = new MediaPool();
  const stored = mapDeckHtml(deck, (html) => pool.pack(html, MEDIA_REF));

  const used = collectPackageIds(deck).filter((id) => registry.has(id));
  const manifest: MmdeckManifest = {
    format: MMDECK_FORMAT,
    version: MMDECK_VERSION,
    title: deck.title,
    savedAt: new Date().toISOString(),
    slides: deck.slides.length,
    packages: Object.fromEntries(used.map((id) => [id, registry.get(id)?.version ?? '?'])),
  };
  const custom = used.filter((id) => !registry.isBuiltin(id));

  const files: Zippable = {
    // `mimetype` primeiro e sem compressão: dá para reconhecer o arquivo pelos primeiros bytes.
    mimetype: [strToU8(MMDECK_MIME), { level: 0 }],
    'manifest.json': strToU8(JSON.stringify(manifest, null, 1)),
    'deck.json': strToU8(JSON.stringify(stored)),
  };
  if (custom.length) files['packages.json'] = strToU8(JSON.stringify(registry.serialize(custom)));
  for (const name of pool.names()) {
    const b64 = pool.get(name)?.base64 ?? '';
    // Imagens e vídeos já vêm comprimidos: guardar como estão é mais rápido e quase do mesmo tamanho.
    const compressible = /\.(svg|bin)$/.test(name);
    files[`media/${name}`] = [base64ToBytes(b64), { level: compressible ? 6 : 0 }];
  }
  return zipSync(files, { level: 6 });
}

/** O conteúdo parece um zip (assinatura `PK\x03\x04`). */
export function looksLikeDeckFile(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function isSlideList(value: unknown): value is Slide[] {
  return (
    Array.isArray(value) &&
    value.every(
      (slide) =>
        slide !== null &&
        typeof slide === 'object' &&
        typeof (slide as Slide).id === 'string' &&
        typeof (slide as Slide).html === 'string'
    )
  );
}

/** Lê um `.mmdeck`. Lança `MmdeckError` com uma mensagem para o usuário se não der. */
export function readDeckFile(bytes: Uint8Array): MmdeckContents {
  if (!looksLikeDeckFile(bytes))
    throw new MmdeckError('Esse arquivo não é uma apresentação .mmdeck.');
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new MmdeckError('O arquivo .mmdeck está corrompido.');
  }
  const json = (name: string): unknown => {
    const file = files[name];
    if (!file) return undefined;
    try {
      return JSON.parse(strFromU8(file)) as unknown;
    } catch {
      throw new MmdeckError(`O arquivo .mmdeck está corrompido (${name}).`);
    }
  };

  const manifest = json('manifest.json') as Partial<MmdeckManifest> | undefined;
  if (manifest?.format !== MMDECK_FORMAT || typeof manifest.version !== 'number') {
    throw new MmdeckError('Esse arquivo não é uma apresentação do Mastermind.');
  }
  if (manifest.version > MMDECK_VERSION) {
    throw new MmdeckError(
      'Essa apresentação foi salva numa versão mais nova do Mastermind. Atualize o editor para abrir.'
    );
  }

  const raw = json('deck.json') as Partial<Deck> | undefined;
  if (!raw || !isSlideList(raw.slides) || (raw.bases !== undefined && !isSlideList(raw.bases))) {
    throw new MmdeckError('O arquivo .mmdeck está corrompido (deck.json).');
  }

  const pool = new MediaPool();
  for (const [path, data] of Object.entries(files)) {
    if (!path.startsWith('media/')) continue;
    const name = path.slice('media/'.length);
    const ext = name.split('.').pop() ?? '';
    pool.set(name, {
      mime: MIME_BY_EXT[ext] ?? 'application/octet-stream',
      base64: bytesToBase64(data),
    });
  }

  const deck = mapDeckHtml(
    {
      ...(raw as Deck),
      title:
        typeof raw.title === 'string' && raw.title ? raw.title : (manifest.title ?? 'Apresentação'),
    },
    (html) => pool.unpack(html, MEDIA_REF)
  );

  const packages = json('packages.json');
  return {
    manifest: {
      format: MMDECK_FORMAT,
      version: manifest.version,
      title: deck.title,
      savedAt: typeof manifest.savedAt === 'string' ? manifest.savedAt : '',
      slides: deck.slides.length,
      packages: manifest.packages && typeof manifest.packages === 'object' ? manifest.packages : {},
    },
    deck,
    packages: Array.isArray(packages) ? (packages as SerializedPackage[]) : [],
  };
}

/** `a` é mais nova que `b` (semver simples: 1.10.0 > 1.9.0). */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff > 0;
  }
  return false;
}

/**
 * Pacotes do arquivo que valem instalar: os que faltam e os que estão numa versão mais nova
 * que a instalada. Os incluídos no editor nunca são substituídos.
 */
export function packagesToInstall(
  packages: SerializedPackage[],
  registry: PackageRegistry
): SerializedPackage[] {
  return packages.filter((pkg) => {
    if (!pkg || typeof pkg.id !== 'string' || registry.isBuiltin(pkg.id)) return false;
    const installed = registry.get(pkg.id);
    return !installed || isNewerVersion(String(pkg.version ?? '0'), installed.version);
  });
}
