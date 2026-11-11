import { createDefaultDeck } from '@packages/core/deck';
import { buildPresentationHTML, exportPresentationFile, loadTemplate } from '@packages/core/export';
import { parseDeckHTML } from '@packages/core/importDeck';
import { registry } from '@packages/core/PackageRegistry';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';

import { insertElement } from './insertElement';
import { importPackagesText } from './packages';

/** Script que abre o diálogo de impressão quando o HTML termina de carregar. */
const AUTOPRINT =
  '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},1800)})</script>';

/** Baixa o HTML autônomo da apresentação (equivale ao "Salvar HTML" do editor original). */
export async function saveHTML(): Promise<string | null> {
  const { deck } = useDeckStore.getState();
  const { showToast } = useUIStore.getState();
  try {
    const filename = await exportPresentationFile({ deck, registry });
    showToast(`Arquivo baixado: ${filename}`, 'success');
    return filename;
  } catch {
    showToast('Não foi possível exportar a apresentação.', 'error');
    return null;
  }
}

/** Abre a apresentação em outra aba já com o diálogo de impressão (PDF). */
export async function openPDF(): Promise<boolean> {
  const { deck } = useDeckStore.getState();
  const { showToast } = useUIStore.getState();
  try {
    const template = await loadTemplate();
    const html = buildPresentationHTML({ template, deck, registry }).replace(
      '</body>',
      `${AUTOPRINT}</body>`
    );
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const win = window.open(url, '_blank');
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    if (!win) {
      showToast('O navegador bloqueou a nova aba. Permita pop-ups para gerar o PDF.', 'error');
      return false;
    }
    showToast('Na janela de impressão, escolha “Salvar como PDF”.', 'info');
    return true;
  } catch {
    showToast('Não foi possível gerar o PDF.', 'error');
    return false;
  }
}

export interface LoadedImage {
  src: string;
  width: number;
  height: number;
}

const MAX_IMAGE_WIDTH = 1800;

/** Lê uma imagem como data URL; reduz fotos maiores que 1800px de largura. */
export function readImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler a imagem.'));
    reader.onload = () => {
      const original = String(reader.result ?? '');
      const image = new Image();
      image.onerror = () => reject(new Error('Imagem inválida.'));
      image.onload = () => {
        let { naturalWidth: width, naturalHeight: height } = image;
        let src = original;
        if (width > MAX_IMAGE_WIDTH && !/gif|svg/.test(file.type)) {
          const ratio = MAX_IMAGE_WIDTH / width;
          const canvas = document.createElement('canvas');
          canvas.width = MAX_IMAGE_WIDTH;
          canvas.height = Math.round(height * ratio);
          canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
          src = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp', 0.9);
          width = canvas.width;
          height = canvas.height;
        }
        resolve({ src, width, height });
      };
      image.src = original;
    };
    reader.readAsDataURL(file);
  });
}

/** Insere uma imagem escolhida pelo usuário no slide atual. */
export async function insertImageFile(file: File): Promise<boolean> {
  const { showToast } = useUIStore.getState();
  if (!file.type.startsWith('image/')) {
    showToast('Selecione um arquivo de imagem.', 'error');
    return false;
  }
  try {
    const image = await readImage(file);
    const result = insertElement('image', { src: image.src, width: Math.min(image.width, 900) });
    if (result) showToast('Imagem inserida no slide', 'success');
    return result !== null;
  } catch {
    showToast('Não foi possível ler a imagem.', 'error');
    return false;
  }
}

/** Abre um `.html` de apresentação (editor original, exportado ou deste editor). */
export async function openDeckFile(file: File): Promise<boolean> {
  const { showToast } = useUIStore.getState();
  try {
    const html = await file.text();
    const imported = parseDeckHTML(html, { title: file.name.replace(/\.html?$/i, '') });
    useDeckStore.getState().setDeck(imported);
    showToast(`“${imported.title}” aberta (${imported.slides.length} slides)`, 'success');
    return true;
  } catch {
    showToast('Não foi possível abrir esse HTML como apresentação.', 'error');
    return false;
  }
}

/** Importa um pacote `.dialcron-pkg.json` e o mantém instalado. */
export async function importPackageFile(file: File): Promise<boolean> {
  const { showToast } = useUIStore.getState();
  try {
    const result = await importPackagesText(await file.text());
    if (result.imported.length > 0) {
      showToast(
        `Pacote(s) importado(s): ${result.imported.map((p) => p.name).join(', ')}`,
        'success'
      );
    }
    if (result.skipped.length > 0) {
      showToast(
        `Ignorado: ${result.skipped.map((p) => `${p.name} (${p.reason})`).join('; ')}`,
        'error'
      );
    }
    return result.imported.length > 0;
  } catch {
    showToast('Esse arquivo não é um pacote válido.', 'error');
    return false;
  }
}

/** Substitui o deck atual por uma apresentação nova. */
export function newDeck(): void {
  useDeckStore.getState().setDeck(createDefaultDeck());
  useUIStore.getState().showToast('Nova apresentação criada', 'success');
}

/** Pergunta antes de descartar alterações não salvas; `true` = pode seguir. */
export function confirmDiscard(): boolean {
  const { canUndo } = useDeckStore.getState();
  return (
    !canUndo || window.confirm('Descartar as alterações atuais? O último rascunho fica guardado.')
  );
}

/** Roteia um arquivo solto: imagem → insere; `.html` → abre; `.json` → pacote. */
export function handleDroppedFile(file: File): void {
  if (file.type.startsWith('image/')) void insertImageFile(file);
  else if (/\.html?$/i.test(file.name)) {
    if (confirmDiscard()) void openDeckFile(file);
  } else if (/\.json$/i.test(file.name)) void importPackageFile(file);
}
