// components/Layout/Layout.tsx
import { Toast } from '@components/common/Toast';
import { WelcomeModal } from '@components/common/WelcomeModal';
import { Inspector } from '@components/Inspector/Inspector';
import { PackageManagerModal } from '@components/PackageManager/PackageManagerModal';
import { Sidebar } from '@components/Sidebar/Sidebar';
import { Stage } from '@components/Stage/Stage';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';

import { Header } from './Header';

export function Layout() {
  const { leftPanelWidth, rightPanelWidth, isPreviewMode, isWelcomeOpen, toast, hideToast } =
    useUIStore();

  return (
    <div className="flex h-full flex-col bg-payday-bg text-payday-text">
      <Header />

      <div className="flex min-h-0 flex-1">
        <aside
          id="left"
          className="flex w-60 shrink-0 flex-col border-r border-payday-border bg-payday-surface"
          style={{ width: leftPanelWidth }}
        >
          <Sidebar />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div
              className={clsx(
                'relative overflow-hidden rounded-lg shadow-[0_30px_70px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/10',
                isPreviewMode && 'outline-2 outline-[#F7D98B] outline-offset-[-2px]'
              )}
              style={{ width: '100%', maxWidth: 'min(100%, 1280px)', aspectRatio: '16 / 9' }}
            >
              <Stage />
            </div>
          </div>
        </main>

        <aside
          id="right"
          className="flex w-72 shrink-0 flex-col border-l border-payday-border bg-payday-surface"
          style={{ width: rightPanelWidth }}
        >
          <Inspector />
        </aside>
      </div>

      {isWelcomeOpen && <WelcomeModal />}
      <PackageManagerModal />
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={hideToast} />}
    </div>
  );
}
