// components/Inspector/Inspector.tsx
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import { ElementTree } from './ElementTree';
import { InspectorContent } from './InspectorContent';

export function Inspector() {
  const { inspectorActiveTab, setInspectorTab } = useUIStore();
  const { selection } = useDeckStore();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div id="tabs" className="flex flex-none border-b border-payday-border bg-payday-surface">
        <TabButton
          label="Estilo"
          active={inspectorActiveTab === 'style'}
          onClick={() => setInspectorTab('style')}
        >
          <circle cx="13.5" cy="6.5" r="1.5" />
          <circle cx="17.5" cy="10.5" r="1.5" />
          <circle cx="8.5" cy="7.5" r="1.5" />
          <circle cx="6.5" cy="12.5" r="1.5" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" />
        </TabButton>
        <TabButton
          label="Conteúdo"
          active={inspectorActiveTab === 'content'}
          onClick={() => setInspectorTab('content')}
        >
          <path d="M4 7V4h16v3M9 20h6M12 4v16" />
        </TabButton>
        <TabButton
          label="Pacote"
          active={inspectorActiveTab === 'package'}
          onClick={() => setInspectorTab('package')}
        >
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </TabButton>
        <TabButton
          label="Animação"
          active={inspectorActiveTab === 'animation'}
          onClick={() => setInspectorTab('animation')}
        >
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
          <circle cx="12" cy="12" r="2.5" />
        </TabButton>
        <TabButton
          label="Pacotes"
          active={inspectorActiveTab === 'packages'}
          onClick={() => setInspectorTab('packages')}
        >
          <path d="M4 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v4H4z" />
          <path d="M14 8V5a2 2 0 1 1 4 0v3h2v10h-6v-3" />
        </TabButton>
      </div>

      <ElementTree />

      <div id="rbody" className="min-h-0 flex-1 overflow-auto">
        <InspectorContent activeTab={inspectorActiveTab} selection={selection} />
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'flex flex-1 flex-col items-center justify-center gap-1 border-b-2 px-1 py-2 text-[10px] transition-colors',
        active
          ? 'border-gold-DEFAULT bg-gold-DEFAULT/10 text-gold-DEFAULT'
          : 'border-transparent text-payday-textMuted hover:border-gold-DEFAULT/35 hover:bg-payday-panel hover:text-payday-text'
      )}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}
