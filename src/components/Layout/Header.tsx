// components/Layout/Header.tsx
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

export function Header() {
  const { canUndo, canRedo, undo, redo, deck } = useDeckStore();
  const {
    isPreviewMode,
    setPreviewMode,
    isPresenting,
    setPresenting,
    openPackageManager,
    openExportModal,
    showToast,
  } = useUIStore();

  const handleSave = () => {
    showToast('Apresentação salva', 'success');
  };

  const handleNewSlide = () => {
    useDeckStore.getState().addSlide();
  };

  const handlePlay = () => {
    if (isPresenting) {
      setPresenting(false);
    } else {
      setPresenting(true);
    }
  };

  const handlePreview = () => {
    setPreviewMode(!isPreviewMode);
  };

  const handleExport = () => {
    openExportModal();
    showToast('Exportando HTML...', 'info');
    // TODO: Implement export
    setTimeout(() => showToast('Export concluído', 'success'), 1000);
  };

  return (
    <header
      id="top"
      className="flex h-[52px] shrink-0 items-center gap-2 overflow-hidden border-b border-white/10 bg-[#10060B] px-3.5"
    >
      <div className="brand flex shrink-0 items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F7D98B]" />
        <span className="text-sm font-semibold tracking-[0.2em] text-[#F3E6E2]/80">MASTERMIND</span>
      </div>

      <div className="grp flex shrink-0 items-center gap-1.5 border-r border-white/10 pr-2.5">
        <button
          className="rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Novo (Ctrl+N)"
          onClick={handleNewSlide}
        >
          <FileText className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Abrir… (Ctrl+O)"
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Salvar (Ctrl+S)"
          onClick={handleSave}
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Exportar HTML"
          onClick={handleExport}
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className="grp flex shrink-0 items-center gap-1.5 border-r border-white/10 pr-2.5">
        <button
          className={clsx(
            'rounded p-1.5 transition hover:bg-white/10 hover:text-[#F7D98B]',
            canUndo ? 'text-[#F3E6E2]/60' : 'text-[#F3E6E2]/25 pointer-events-none'
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
            canRedo ? 'text-[#F3E6E2]/60' : 'text-[#F3E6E2]/25 pointer-events-none'
          )}
          title="Refazer (Ctrl+Y)"
          onClick={() => {
            if (canRedo) redo();
          }}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grp flex shrink-0 items-center gap-1.5 border-r border-white/10 pr-2.5">
        <button
          className="inline-flex items-center gap-1 whitespace-nowrap rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Inserir caixa de texto"
        >
          <Type className="w-4 h-4" />
          <span className="hidden xl:inline">Texto</span>
        </button>
        <button
          className="inline-flex items-center gap-1 whitespace-nowrap rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Inserir imagem"
        >
          <Image className="w-4 h-4" />
          <span className="hidden xl:inline">Imagem</span>
        </button>
        <button
          className="rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Retângulo"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Elipse"
        >
          <Circle className="w-4 h-4" />
        </button>
        <button
          className="rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
          title="Linha"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      <div className="grp nb flex shrink-0 items-center gap-1.5">
        <button
          className="inline-flex items-center gap-1 whitespace-nowrap rounded p-1.5 text-[#F3E6E2]/60 transition hover:bg-white/10 hover:text-[#F7D98B]"
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
        className="min-w-0 truncate pr-2 text-xs text-[#F3E6E2]/35"
        title={`${deck.title} • ${deck.slides.length} slide${deck.slides.length !== 1 ? 's' : ''}`}
      >
        {deck.title} • {deck.slides.length} slide{deck.slides.length !== 1 ? 's' : ''}
      </span>

      <div className="grp tools2 flex shrink-0 items-center gap-1.5">
        <button
          className={clsx(
            'inline-flex items-center gap-1 whitespace-nowrap rounded p-1.5 transition hover:bg-white/10 hover:text-[#F7D98B]',
            isPreviewMode && 'text-[#C77C8A]'
          )}
          title="Visualizar (P)"
          onClick={handlePreview}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden xl:inline">Visualizar</span>
        </button>
        <button
          className={clsx(
            'inline-flex items-center gap-1 whitespace-nowrap rounded border-0 px-3 py-1.5 text-xs font-medium transition',
            isPresenting
              ? 'bg-[#C77C8A] text-[#2A0E1A]'
              : 'bg-gradient-to-r from-[#F7D98B] to-[#D6A84F] text-[#2A0E1A]'
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
