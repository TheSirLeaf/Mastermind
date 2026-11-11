// components/Inspector/InspectorContent.tsx
import type { SelectionInfo } from '@packages/core/types';
import type { InspectorTab } from '@stores/uiStore';

import { AnimationTab } from './AnimationTab';
import { AppearanceSection } from './AppearanceSection';
import { ContentTab } from './ContentTab';
import { CounterSection } from './CounterSection';
import { ElementActions } from './ElementActions';
import { EmptyState } from './EmptyState';
import { PackagesPanel } from './PackagesPanel';
import { PackageTab } from './PackageTab';
import { SlideTab } from './SlideTab';
import { StyleTab } from './StyleTab';

interface InspectorContentProps {
  activeTab: InspectorTab;
  selection: SelectionInfo | null;
}

export function InspectorContent({ activeTab, selection }: InspectorContentProps) {
  if (activeTab === 'packages') {
    return <PackagesPanel />;
  }

  if (activeTab === 'slide') {
    return <SlideTab />;
  }

  if (!selection) {
    return <EmptyState message="Clique em um elemento do slide para selecioná-lo" icon="layout" />;
  }

  // For now, we show the selection info and the appropriate tab
  // The actual form editing will be implemented in the tabs
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 rounded-md border border-[#F7D98B]/20 bg-[#F7D98B]/5 p-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-[#F7D98B]/70">Selecionado</div>
          <div className="mt-1 truncate font-medium text-payday-text">{selection.label}</div>
          <div className="mt-1 font-mono text-[10px] text-payday-textDim/50">
            {'<' + selection.tag + '>'} · {selection.path.join('.')}
          </div>
        </div>
        <ElementActions />
      </div>

      {activeTab === 'style' && (
        <>
          <StyleTab selection={selection} />
          <AppearanceSection selection={selection} />
        </>
      )}
      {activeTab === 'content' && <ContentTab selection={selection} />}
      {activeTab === 'package' && <PackageTab selection={selection} />}
      {activeTab === 'animation' && (
        <>
          <AnimationTab selection={selection} />
          <CounterSection selection={selection} />
        </>
      )}
    </div>
  );
}
