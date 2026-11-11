// components/Inspector/Inspector.tsx
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';

import { InspectorContent } from './InspectorContent';

export function Inspector() {
  const { inspectorActiveTab, setInspectorTab, isPackageManagerOpen } = useUIStore();
  const { selection } = useDeckStore();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        id="tabs"
        className="grid grid-cols-4 border-b border-white/10 bg-white/[0.02] flex-none"
      >
        <button
          className={clsx('tab', inspectorActiveTab === 'style' && 'active')}
          onClick={() => setInspectorTab('style')}
          title="Estilo"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="13.5" cy="6.5" r="1.5" />
            <circle cx="17.5" cy="10.5" r="1.5" />
            <circle cx="8.5" cy="7.5" r="1.5" />
            <circle cx="6.5" cy="12.5" r="1.5" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" />
          </svg>
          <span>Estilo</span>
        </button>
        <button
          className={clsx('tab', inspectorActiveTab === 'content' && 'active')}
          onClick={() => setInspectorTab('content')}
          title="Conteúdo"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7V4h16v3M9 20h6M12 4v16" />
          </svg>
          <span>Conteúdo</span>
        </button>
        <button
          className={clsx('tab', inspectorActiveTab === 'package' && 'active')}
          onClick={() => setInspectorTab('package')}
          title="Pacote"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
          <span>Pacote</span>
        </button>
        <button
          className={clsx('tab', isPackageManagerOpen && 'active')}
          onClick={() => useUIStore.getState().openPackageManager()}
          title="Gerenciar pacotes"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v4H4z" />
            <path d="M14 8V5a2 2 0 1 1 4 0v3h2v10h-6v-3" />
          </svg>
          <span>Pacotes</span>
        </button>
      </div>

      <div id="rbody" className="flex-1 overflow-auto min-h-0">
        <InspectorContent activeTab={inspectorActiveTab} selection={selection} />
      </div>
    </div>
  );
}
