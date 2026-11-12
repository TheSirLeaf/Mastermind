// components/Inspector/Inspector.tsx
import { useDeckStore } from '@store/deckStore';
import { useUIStore, type InspectorTab, type Workspace } from '@stores/uiStore';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import { Tooltip } from '../common/Tooltip';

import { ElementTree } from './ElementTree';
import { InspectorContent } from './InspectorContent';

const ICONS: Record<InspectorTab, ReactNode> = {
  style: (
    <>
      <circle cx="13.5" cy="6.5" r="1.5" />
      <circle cx="17.5" cy="10.5" r="1.5" />
      <circle cx="8.5" cy="7.5" r="1.5" />
      <circle cx="6.5" cy="12.5" r="1.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" />
    </>
  ),
  content: <path d="M4 7V4h16v3M9 20h6M12 4v16" />,
  package: (
    <>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  animation: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  slide: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
};

const LABELS: Record<InspectorTab, string> = {
  style: 'Estilo',
  content: 'Conteúdo',
  package: 'Pacote',
  animation: 'Animação',
  slide: 'Slides',
};

/** Cada área de trabalho mostra só o seu inspetor. */
const TABS_BY_WORKSPACE: Record<Workspace, InspectorTab[]> = {
  editor: ['style', 'content', 'package'],
  animation: ['animation', 'package'],
  slide: ['slide'],
  integration: [],
  presentation: ['style', 'content', 'package', 'slide'],
};

export function Inspector() {
  const { inspectorActiveTab, setInspectorTab, workspace } = useUIStore();
  const { selection } = useDeckStore();
  const tabs = TABS_BY_WORKSPACE[workspace];
  const activeTab = tabs.includes(inspectorActiveTab) ? inspectorActiveTab : (tabs[0] ?? 'style');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div id="tabs" className="flex flex-none border-b border-payday-border bg-payday-surface">
        {tabs.map((tab) => (
          <TabButton
            key={tab}
            label={LABELS[tab]}
            active={activeTab === tab}
            onClick={() => setInspectorTab(tab)}
          >
            {ICONS[tab]}
          </TabButton>
        ))}
      </div>

      <ElementTree />

      <div id="rbody" className="min-h-0 flex-1 overflow-auto">
        <InspectorContent activeTab={activeTab} selection={selection} workspace={workspace} />
      </div>
    </div>
  );
}

const TAB_HINTS: Record<string, string> = {
  Estilo: 'Posição, tamanho, cores e tipografia.',
  Conteúdo: 'Texto ou imagem do elemento.',
  Pacote: 'Edita o pacote selecionado ou insere um novo.',
  Animação: 'Animação de entrada do elemento.',
  Slide: 'Fundo e ajustes do slide atual.',
};

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
    <Tooltip title={label} description={TAB_HINTS[label]} side="bottom" className="flex-1">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={clsx(
          'flex w-full flex-col items-center justify-center gap-1 border-b-2 px-1 py-2 text-[10px] transition-colors',
          active
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-transparent text-payday-textMuted hover:border-accent/35 hover:bg-payday-panel hover:text-payday-text'
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
    </Tooltip>
  );
}
