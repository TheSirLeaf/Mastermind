// components/Inspector/InspectorContent.tsx
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import type { InspectorTab, Workspace } from '@stores/uiStore';

import { RenameLabel } from '../common/RenameLabel';

import { AnimationTab } from './AnimationTab';
import { BaseFxButtons } from './BaseBlocks';
import { ContentTab } from './ContentTab';
import { CounterSection } from './CounterSection';
import { ElementActions } from './ElementActions';
import { readSelectedElement } from './elementSelection';
import { EmptyState } from './EmptyState';
import { PackageTab } from './PackageTab';
import { SlideTab } from './SlideTab';
import { StyleTab } from './StyleTab';

interface InspectorContentProps {
  activeTab: InspectorTab;
  selection: SelectionInfo | null;
  workspace?: Workspace;
}

export function InspectorContent({
  activeTab,
  selection,
  workspace = 'editor',
}: InspectorContentProps) {
  const isBase = useDeckStore((state) => state.currentIndex >= state.deck.slides.length);
  // Reage às mudanças do slide para o nome renomeado aparecer na hora.
  useDeckStore((state) => state.deck);
  const shownName =
    (selection ? readSelectedElement(selection)?.getAttribute('data-name')?.trim() : '') ||
    selection?.label ||
    '';

  if (activeTab === 'slide') {
    return <SlideTab />;
  }

  // O pacote cuida dos dois casos: editar o selecionado ou inserir um novo.
  if (activeTab === 'package') {
    return (
      <PackageTab selection={selection} mode={workspace === 'animation' ? 'animation' : 'style'} />
    );
  }

  if (!selection) {
    return (
      <>
        <EmptyState message="Clique em um elemento do slide para selecioná-lo" icon="layout" />
        {isBase ? (
          <div className="px-4 pb-4">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-sky-400">
              Slide base — adicionar ao fundo
            </div>
            <BaseFxButtons />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2 rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1.5">
        <div className="min-w-0 flex-1">
          <RenameLabel
            value={shownName}
            pencil
            onCommit={(name) =>
              useDeckStore
                .getState()
                .patchElement(selection.path, { attrs: { 'data-name': name || null } })
            }
            className="flex max-w-full items-center text-left text-xs font-medium text-payday-text"
          />
          <div className="font-mono text-[10px] text-payday-textDim/60">
            {'<' + selection.tag + '>'}
          </div>
        </div>
        <ElementActions />
      </div>

      {activeTab === 'style' && <StyleTab selection={selection} />}
      {activeTab === 'content' && <ContentTab selection={selection} />}
      {activeTab === 'animation' && (
        <>
          <AnimationTab selection={selection} />
          <CounterSection selection={selection} />
        </>
      )}
    </div>
  );
}
