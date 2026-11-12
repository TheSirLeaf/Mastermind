// components/Layout/BottomDock.tsx
// Barra de ferramentas inferior da área "Editor".
import type { BridgeCommand } from '@packages/core/iframeBridge';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Eye,
  Lock,
  LockOpen,
  Minus,
  Redo2,
  RectangleHorizontal,
  Trash2,
  Type,
  Undo2,
  ImagePlus,
  Circle,
} from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';

import { insertImageFile } from '../../editor/actions';
import { getActiveBridge } from '../../editor/bridgeRef';
import { insertElement, type InsertableElement } from '../../editor/insertElement';
import { mutateSelectedElement, readSelectedElement } from '../Inspector/elementSelection';

import { PackagesMenu } from './PackagesMenu';
import { ToolButton, ToolDivider } from './ToolButton';

export function BottomDock() {
  const { canUndo, canRedo, undo, redo, selection } = useDeckStore();
  const { isPreviewMode, setPreviewMode, setPresenting, showToast } = useUIStore();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasSelection = Boolean(selection);

  // Relê o deck para o estado do cadeado acompanhar edições.
  useDeckStore((state) => state.deck);
  const locked = selection
    ? (readSelectedElement(selection) as HTMLElement | null)?.style?.pointerEvents === 'none'
    : false;

  const insert = (kind: InsertableElement) => {
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
    if (file) await insertImageFile(file);
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

  const toggleLock = () => {
    if (!selection) return;
    mutateSelectedElement(selection, (node) => {
      const style = (node as HTMLElement).style;
      if (style.pointerEvents === 'none') style.removeProperty('pointer-events');
      else style.setProperty('pointer-events', 'none');
    });
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
          onChange={handleImageFile}
          aria-hidden="true"
          tabIndex={-1}
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
          description="Adiciona uma caixa de texto ao slide."
          onClick={() => insert('text')}
        />
        <ToolButton
          icon={ImagePlus}
          label="Imagem"
          description="Insere uma imagem do seu computador. Também dá para arrastar o arquivo."
          onClick={() => insert('image')}
        />
        <ToolButton
          icon={RectangleHorizontal}
          label="Retângulo"
          description="Forma retangular com cor de preenchimento."
          onClick={() => insert('rect')}
        />
        <ToolButton
          icon={Circle}
          label="Elipse"
          description="Forma circular ou oval."
          onClick={() => insert('ellipse')}
        />
        <ToolButton
          icon={Minus}
          label="Linha"
          description="Linha reta, boa para separar blocos."
          onClick={() => insert('line')}
        />

        <ToolDivider />

        <PackagesMenu />

        <ToolDivider />

        <ToolButton
          icon={Copy}
          label="Duplicar"
          description="Cria uma cópia do elemento selecionado."
          shortcut="Ctrl+D"
          disabled={!hasSelection}
          onClick={command('duplicate')}
        />
        <ToolButton
          icon={ArrowUpToLine}
          label="Frente"
          description="Traz o elemento para a frente das demais camadas."
          disabled={!hasSelection}
          onClick={command('front')}
        />
        <ToolButton
          icon={ArrowDownToLine}
          label="Trás"
          description="Envia o elemento para trás das demais camadas."
          disabled={!hasSelection}
          onClick={command('back')}
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
          onClick={toggleLock}
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
