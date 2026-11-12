// components/Inspector/InspectorContent.tsx
import type { SelectionInfo } from '@packages/core/types';
import type { InspectorTab, Workspace } from '@stores/uiStore';

import { AnimationTab } from './AnimationTab';
import { ContentTab } from './ContentTab';
import { CounterSection } from './CounterSection';
import { ElementActions } from './ElementActions';
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
    return <EmptyState message="Clique em um elemento do slide para selecioná-lo" icon="layout" />;
  }

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-2 rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-payday-text">{selection.label}</div>
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
