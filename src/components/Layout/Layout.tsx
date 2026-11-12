// components/Layout/Layout.tsx
import { Toast } from '@components/common/Toast';
import { WelcomeModal } from '@components/common/WelcomeModal';
import { Inspector } from '@components/Inspector/Inspector';
import { PackageManagerModal } from '@components/PackageManager/PackageManagerModal';
import { NewSlideModal } from '@components/Sidebar/NewSlideModal';
import { Sidebar } from '@components/Sidebar/Sidebar';
import { PalettePanel } from '@components/Stage/PalettePanel';
import { PresentationOverlay } from '@components/Stage/PresentationOverlay';
import { StageViewport } from '@components/Stage/StageViewport';
import { useUIStore } from '@stores/uiStore';
import { PlugZap } from 'lucide-react';

import { SettingsModal } from '../common/SettingsModal';
import { Timeline } from '../Timeline/Timeline';

import { BottomDock } from './BottomDock';
import { TopBar } from './TopBar';

export function Layout() {
  const {
    workspace,
    showLeftPanel,
    showRightPanel,
    leftPanelWidth,
    rightPanelWidth,
    isPreviewMode,
    isPresenting,
    isWelcomeOpen,
    toast,
    hideToast,
  } = useUIStore();

  return (
    <div className="flex h-full flex-col bg-payday-bg text-payday-text">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        {showLeftPanel && workspace !== 'integration' ? (
          <aside
            id="left"
            className="flex w-60 shrink-0 flex-col border-r border-payday-border bg-payday-surface"
            style={{ width: leftPanelWidth }}
          >
            <Sidebar />
          </aside>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          {workspace === 'integration' ? (
            <IntegrationPlaceholder />
          ) : (
            <>
              <StageViewport highlighted={isPreviewMode} arrange={workspace === 'slide'} />
              {workspace === 'animation' ? (
                <Timeline />
              ) : workspace === 'slide' ? (
                <PalettePanel />
              ) : (
                <BottomDock />
              )}
            </>
          )}
        </main>

        {showRightPanel && workspace !== 'integration' ? (
          <aside
            id="right"
            className="flex w-72 shrink-0 flex-col border-l border-payday-border bg-payday-surface"
            style={{ width: rightPanelWidth }}
          >
            <Inspector />
          </aside>
        ) : null}
      </div>

      {(isPreviewMode || isPresenting) && (
        <PresentationOverlay mode={isPresenting ? 'present' : 'preview'} />
      )}
      {isWelcomeOpen && <WelcomeModal />}
      <PackageManagerModal />
      <NewSlideModal />
      <SettingsModal />
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={hideToast} />}
    </div>
  );
}

function IntegrationPlaceholder() {
  return (
    <div className="grid flex-1 place-items-center text-center">
      <div>
        <PlugZap className="mx-auto mb-3 h-10 w-10 text-payday-textDim" />
        <b className="block text-payday-text">Integração</b>
        <p className="mt-1 text-xs text-payday-textMuted">
          Em desenvolvimento — fora do escopo desta versão.
        </p>
      </div>
    </div>
  );
}
