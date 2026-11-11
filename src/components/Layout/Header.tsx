// components/Layout/Header.tsx
import { createDefaultDeck } from '@packages/core/deck';
import { exportPresentationFile } from '@packages/core/export';
import { parseDeckHTML } from '@packages/core/importDeck';
import { registry } from '@packages/core/PackageRegistry';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import {
  Undo2,
  Redo2,
  Type,
  Image,
  Square,
  Circle,
  Minus,
  Package,
  ChevronDown,
  Save,
  Play,
  FileText,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';

import { insertElement, type InsertableElement } from '../../editor/insertElement';

export function Header() {
  const { canUndo, canRedo, undo, redo, deck } = useDeckStore();
  const {
    isPreviewMode,
    setPreviewMode,
    isPresenting,
    setPresenting,
    openPackageManager,
    showToast,
  } = useUIStore();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const deckInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleSave = () => {
    showToast('Apresentação salva', 'success');
  };

  const handleNewPresentation = () => {
    const confirmed = window.confirm(
      'Criar uma nova apresentação? O deck atual continuará salvo até a próxima alteração.'
    );
    if (!confirmed) return;
    useDeckStore.getState().setDeck(createDefaultDeck());
    showToast('Nova apresentação criada', 'success');
  };

  const handleOpenClick = () => deckInputRef.current?.click();

  const handleDeckFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const html = await file.text();
      const imported = parseDeckHTML(html, { title: file.name.replace(/\.html?$/i, '') });
      useDeckStore.getState().setDeck(imported);
      showToast(`“${imported.title}” aberta (${imported.slides.length} slides)`, 'success');
    } catch {
      showToast('Não foi possível abrir esse HTML como apresentação.', 'error');
    }
  };

  const handlePlay = () => {
    if (isPresenting) {
      setPresenting(false);
      return;
    }
    setPreviewMode(false);
    setPresenting(true);
  };

  const handlePreview = () => {
    if (isPreviewMode) {
      setPreviewMode(false);
      return;
    }
    setPresenting(false);
    setPreviewMode(true);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const filename = await exportPresentationFile({ deck, registry });
      showToast(`Exportado: ${filename}`, 'success');
    } catch {
      showToast('Não foi possível exportar a apresentação.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleInsert = (kind: InsertableElement) => {
    if (kind === 'image') {
      imageInputRef.current?.click();
      return;
    }
    const result = insertElement(kind);
    if (!result) {
      showToast('Não foi possível inserir o elemento.', 'error');
      return;
    }
    showToast(`${result.label} inserido no slide`, 'success');
  };

  const handleImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem.', 'error');
      return;
    }
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }).catch(() => '');
    if (!src) {
      showToast('Não foi possível ler a imagem.', 'error');
      return;
    }
    const result = insertElement('image', { src });
    if (result) showToast('Imagem inserida no slide', 'success');
  };

  return (
    <header
      id="top"
      className="flex h-[52px] shrink-0 items-center gap-2 overflow-hidden border-b border-payday-border bg-payday-bg px-3.5"
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={deckInputRef}
        type="file"
        accept=".html,text/html"
        className="hidden"
        onChange={handleDeckFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="brand flex shrink-0 items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F7D98B]" />
        <span className="text-sm font-semibold tracking-[0.2em] text-payday-textMuted">
          MASTERMIND
        </span>
      </div>

      <div className="grp flex shrink-0 items-center gap-1.5 border-r border-payday-border pr-2.5">
        <button
          className="rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Novo — nova apresentação"
          onClick={handleNewPresentation}
        >
          <FileText className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Abrir apresentação (HTML)"
          onClick={handleOpenClick}
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Salvar (Ctrl+S)"
          onClick={handleSave}
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          className={clsx(
            'rounded p-1.5 transition hover:bg-white/10 hover:text-[#F7D98B]',
            exporting ? 'text-gold-DEFAULT' : 'text-payday-textMuted'
          )}
          title="Exportar HTML"
          onClick={() => void handleExport()}
          disabled={exporting}
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="grp flex shrink-0 items-center gap-1.5 border-r border-payday-border pr-2.5">
        <button
          className={clsx(
            'rounded p-1.5 transition hover:bg-white/10 hover:text-[#F7D98B]',
            canUndo ? 'text-payday-textMuted' : 'text-payday-textDim pointer-events-none'
          )}
          title="Desfazer (Ctrl+Z)"
          onClick={() => {
            if (canUndo) undo();
          }}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          className={clsx(
            'rounded p-1.5 transition hover:bg-white/10 hover:text-[#F7D98B]',
            canRedo ? 'text-payday-textMuted' : 'text-payday-textDim pointer-events-none'
          )}
          title="Refazer (Ctrl+Y)"
          onClick={() => {
            if (canRedo) redo();
          }}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grp flex shrink-0 items-center gap-1.5 border-r border-payday-border pr-2.5">
        <button
          className="inline-flex items-center gap-1 whitespace-nowrap rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Inserir caixa de texto"
          onClick={() => handleInsert('text')}
        >
          <Type className="w-4 h-4" />
          <span className="hidden xl:inline">Texto</span>
        </button>
        <button
          className="inline-flex items-center gap-1 whitespace-nowrap rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Inserir imagem"
          onClick={() => handleInsert('image')}
        >
          <Image className="w-4 h-4" />
          <span className="hidden xl:inline">Imagem</span>
        </button>
        <button
          className="rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Retângulo"
          onClick={() => handleInsert('rect')}
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Elipse"
          onClick={() => handleInsert('ellipse')}
        >
          <Circle className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Linha"
          onClick={() => handleInsert('line')}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      <div className="grp nb flex shrink-0 items-center gap-1.5">
        <button
          className="inline-flex items-center gap-1 whitespace-nowrap rounded p-1.5 text-payday-textMuted transition hover:bg-payday-surface hover:text-gold-DEFAULT"
          title="Inserir elementos de pacotes"
          onClick={openPackageManager}
        >
          <Package className="w-4 h-4" />
          <span className="hidden xl:inline">Pacotes</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="sp min-w-2 flex-1" />

      <span
        id="saveState"
        className="min-w-0 truncate pr-2 text-xs text-payday-textDim"
        title={`${deck.title} • ${deck.slides.length} slide${deck.slides.length !== 1 ? 's' : ''}`}
      >
        {deck.title} • {deck.slides.length} slide{deck.slides.length !== 1 ? 's' : ''}
      </span>

      <div className="grp tools2 flex shrink-0 items-center gap-1.5">
        <button
          className={clsx(
            'inline-flex items-center gap-1 whitespace-nowrap rounded p-1.5 transition hover:bg-white/10 hover:text-[#F7D98B]',
            isPreviewMode && 'text-gold-DEFAULT'
          )}
          title="Visualizar"
          onClick={handlePreview}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden xl:inline">Visualizar</span>
        </button>
        <button
          className={clsx(
            'inline-flex items-center gap-1 whitespace-nowrap rounded border-0 px-3 py-1.5 text-xs font-medium transition',
            isPresenting
              ? 'bg-[#C77C8A] text-payday-bg'
              : 'bg-gradient-to-r from-gold-DEFAULT to-gold-dark text-payday-bg'
          )}
          title="Apresentar (F5)"
          onClick={handlePlay}
        >
          <Play className="w-4 h-4" /> {isPresenting ? 'Parar' : 'Apresentar'}
        </button>
      </div>
    </header>
  );
}
