// components/Layout/BottomDock.tsx
// Barra de ferramentas inferior da área "Editor": inserir (texto, mídia, formas, efeitos, pacotes),
// organizar (alinhar, camadas, pai/filho) e ações do elemento.
import type { BridgeCommand } from '@packages/core/iframeBridge';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Circle,
  Copy,
  Droplet,
  Eye,
  Film,
  Focus,
  Hash,
  ImagePlay,
  ImagePlus,
  Layers,
  Link,
  Link2,
  Lock,
  LockOpen,
  Minus,
  RectangleHorizontal,
  Redo2,
  Shapes,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Undo2,
  Unlink,
  Video,
} from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';

import { insertImageFile, insertVideoFile, insertVideoUrl } from '../../editor/actions';
import {
  alignToSlide,
  moveLayer,
  pickParent,
  releaseFromParent,
  toggleLock,
} from '../../editor/arrange';
import { getActiveBridge } from '../../editor/bridgeRef';
import { insertBaseElement } from '../../editor/insertBaseElement';
import { insertElement, type InsertableElement } from '../../editor/insertElement';
import { readSelectedElement } from '../Inspector/elementSelection';

import { DockMenu } from './DockMenu';
import { PackagesMenu } from './PackagesMenu';
import { ToolButton, ToolDivider } from './ToolButton';

export function BottomDock() {
  const { canUndo, canRedo, undo, redo, selection } = useDeckStore();
  const { isPreviewMode, setPreviewMode, setPresenting, showToast } = useUIStore();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const hasSelection = Boolean(selection);

  // Relê o deck para o estado do cadeado e do "pai" acompanharem as edições.
  useDeckStore((state) => state.deck);
  const element = selection ? (readSelectedElement(selection) as HTMLElement | null) : null;
  const locked = element?.style?.pointerEvents === 'none';
  const nested = Boolean(selection && selection.path.length > 2);

  const insert = (kind: InsertableElement) => {
    const result = insertElement(kind);
    if (!result) {
      showToast('Não foi possível inserir o elemento.', 'error');
      return;
    }
    showToast(`${result.label} inserido no slide`, 'success');
  };

  const fx = (kind: 'watermark' | 'light' | 'counter', label: string) => () => {
    if (insertBaseElement(kind)) showToast(`${label} inserido no slide`, 'success');
    else showToast('Não foi possível inserir.', 'error');
  };

  const onFile =
    (handler: (file: File) => Promise<boolean>) => async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) await handler(file);
    };

  const askVideoUrl = () => {
    const url = window.prompt('Endereço do vídeo (arquivo .mp4 ou .webm na internet):', 'https://');
    if (url && url.trim() !== 'https://') insertVideoUrl(url);
  };

  const command = (name: BridgeCommand) => () => getActiveBridge()?.command(name);

  const togglePreview = () => {
    if (isPreviewMode) {
      setPreviewMode(false);
      return;
    }
    setPresenting(false);
    setPreviewMode(true);
  };

  return (
    <div
      id="dock"
      role="toolbar"
      aria-label="Ferramentas"
      className="flex h-[48px] shrink-0 items-center overflow-x-auto border-t border-payday-border bg-[#0f0f10] px-2 2xl:h-[58px]"
    >
      <div className="m-auto flex shrink-0 items-center gap-0.5">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFile(insertImageFile)}
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={gifInputRef}
          type="file"
          accept="image/gif"
          className="hidden"
          onChange={onFile(insertImageFile)}
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={onFile(insertVideoFile)}
          aria-hidden="true"
          tabIndex={-1}
          data-testid="video-input"
        />

        <ToolButton
          icon={Undo2}
          label="Desfazer"
          description="Volta a última alteração."
          shortcut="Ctrl+Z"
          disabled={!canUndo}
          onClick={undo}
        />
        <ToolButton
          icon={Redo2}
          label="Refazer"
          description="Reaplica a alteração desfeita."
          shortcut="Ctrl+Y"
          disabled={!canRedo}
          onClick={redo}
        />

        <ToolDivider />

        <ToolButton
          icon={Type}
          label="Texto"
          description="Adiciona uma caixa de texto. Dois cliques para editar; selecione um trecho para formatar."
          onClick={() => insert('text')}
        />
        <DockMenu
          icon={ImagePlus}
          label="Mídia"
          description="Imagem, GIF animado ou vídeo. Também dá para arrastar o arquivo para o palco."
          items={[
            {
              label: 'Imagem',
              description: 'PNG, JPG, SVG… do seu computador',
              icon: ImagePlus,
              onSelect: () => imageInputRef.current?.click(),
            },
            {
              label: 'GIF animado',
              description: 'Toca sozinho, em loop',
              icon: ImagePlay,
              onSelect: () => gifInputRef.current?.click(),
            },
            'separator',
            {
              label: 'Vídeo do computador',
              description: 'Até 40 MB; fica dentro da apresentação',
              icon: Film,
              onSelect: () => videoInputRef.current?.click(),
            },
            {
              label: 'Vídeo por link',
              description: 'Arquivo .mp4/.webm na internet',
              icon: Video,
              onSelect: askVideoUrl,
            },
          ]}
        />
        <DockMenu
          icon={Shapes}
          label="Formas"
          description="Retângulo, elipse e linha."
          items={[
            { label: 'Retângulo', icon: RectangleHorizontal, onSelect: () => insert('rect') },
            { label: 'Elipse', icon: Circle, onSelect: () => insert('ellipse') },
            { label: 'Linha', icon: Minus, onSelect: () => insert('line') },
          ]}
        />
        <DockMenu
          icon={Sparkles}
          label="Efeitos"
          description="Marca d’água, luz e contador de slides — em qualquer slide (ou no slide base)."
          items={[
            {
              label: 'Marca d’água',
              description: 'Texto grande e transparente no fundo',
              icon: Droplet,
              onSelect: fx('watermark', 'Marca d’água'),
            },
            {
              label: 'Efeito de luz',
              description: 'Brilho circular suave',
              icon: Sun,
              onSelect: fx('light', 'Efeito de luz'),
            },
            {
              label: 'Contador de slides',
              description: 'Mostra “número / total”',
              icon: Hash,
              onSelect: fx('counter', 'Contador'),
            },
          ]}
        />
        <PackagesMenu />

        <ToolDivider />

        <DockMenu
          icon={AlignCenterVertical}
          label="Alinhar"
          description="Alinha o elemento no slide. Ao arrastar, as guias encaixam sozinhas (segure Ctrl para soltar)."
          disabled={!hasSelection}
          items={[
            {
              label: 'À esquerda',
              icon: AlignStartVertical,
              onSelect: () => alignToSlide('left', null),
            },
            {
              label: 'No centro (horizontal)',
              icon: AlignCenterVertical,
              onSelect: () => alignToSlide('center', null),
            },
            {
              label: 'À direita',
              icon: AlignEndVertical,
              onSelect: () => alignToSlide('right', null),
            },
            'separator',
            {
              label: 'No topo',
              icon: AlignStartHorizontal,
              onSelect: () => alignToSlide(null, 'top'),
            },
            {
              label: 'No meio (vertical)',
              icon: AlignCenterHorizontal,
              onSelect: () => alignToSlide(null, 'middle'),
            },
            {
              label: 'Na base',
              icon: AlignEndHorizontal,
              onSelect: () => alignToSlide(null, 'bottom'),
            },
            'separator',
            {
              label: 'Centralizar no slide',
              icon: Focus,
              onSelect: () => alignToSlide('center', 'middle'),
            },
          ]}
        />
        <DockMenu
          icon={Layers}
          label="Camadas"
          description="Quem fica por cima de quem. Um passo considera só os elementos que se sobrepõem."
          disabled={!hasSelection}
          items={[
            {
              label: 'Trazer para frente',
              description: 'Passa por cima do próximo que o cobre',
              icon: ArrowUp,
              shortcut: 'Ctrl+]',
              onSelect: () => moveLayer('forward'),
            },
            {
              label: 'Trazer ao topo',
              icon: ArrowUpToLine,
              shortcut: 'Ctrl+Shift+]',
              onSelect: () => moveLayer('front'),
            },
            {
              label: 'Enviar para trás',
              description: 'Passa por baixo do próximo que ele cobre',
              icon: ArrowDown,
              shortcut: 'Ctrl+[',
              onSelect: () => moveLayer('backward'),
            },
            {
              label: 'Enviar ao fundo',
              icon: ArrowDownToLine,
              shortcut: 'Ctrl+Shift+[',
              onSelect: () => moveLayer('back'),
            },
          ]}
        />
        <DockMenu
          icon={Link}
          label="Pai"
          description="Coloca o elemento dentro de outro para moverem, animarem e sumirem juntos."
          disabled={!hasSelection}
          items={[
            {
              label: 'Definir pai…',
              description: 'Depois clique no elemento que vai ser o pai',
              icon: Link2,
              onSelect: pickParent,
            },
            {
              label: 'Soltar do pai',
              description: 'Volta a ser independente, no mesmo lugar',
              icon: Unlink,
              disabled: !nested,
              onSelect: releaseFromParent,
            },
          ]}
        />

        <ToolDivider />

        <ToolButton
          icon={Copy}
          label="Duplicar"
          description="Cria uma cópia do elemento. Alt + arrastar também duplica."
          shortcut="Ctrl+D"
          disabled={!hasSelection}
          onClick={command('duplicate')}
        />
        <ToolButton
          icon={locked ? LockOpen : Lock}
          label={locked ? 'Destravar' : 'Travar'}
          description={
            locked
              ? 'Permite mover e redimensionar o elemento de novo.'
              : 'Impede mover ou redimensionar sem querer. Continua selecionável.'
          }
          active={locked}
          disabled={!hasSelection}
          onClick={() => toggleLock(selection)}
        />
        <ToolButton
          icon={Trash2}
          label="Excluir"
          description="Remove o elemento selecionado (mesmo se estiver travado)."
          shortcut="Del"
          disabled={!hasSelection}
          onClick={command('delete')}
        />

        <ToolDivider />

        <ToolButton
          icon={Eye}
          label="Visualizar"
          description="Mostra as animações do slide como na apresentação."
          active={isPreviewMode}
          onClick={togglePreview}
        />
      </div>
    </div>
  );
}
