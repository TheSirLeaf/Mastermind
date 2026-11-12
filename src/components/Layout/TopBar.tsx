// components/Layout/TopBar.tsx
// Barra superior no estilo Blender: menu à esquerda, abas de área de trabalho ao centro.
import { useDeckStore } from '@store/deckStore';
import { useUIStore, type Workspace } from '@stores/uiStore';
import { clsx } from 'clsx';
import {
  Clapperboard,
  LayoutGrid,
  PencilRuler,
  PlugZap,
  Presentation,
  type LucideIcon,
} from 'lucide-react';

import { APP_VERSION } from '../../version';
import { Tooltip } from '../common/Tooltip';

import { AppMenu } from './AppMenu';

interface WorkspaceDef {
  id: Workspace;
  label: string;
  icon: LucideIcon;
  description: string;
  wip?: boolean;
  shortcut?: string;
}

const WORKSPACES: WorkspaceDef[] = [
  { id: 'editor', label: 'Editor', icon: PencilRuler, description: 'Monte e edite os slides.' },
  {
    id: 'animation',
    label: 'Animação',
    icon: Clapperboard,
    description: 'Linha do tempo das animações do slide.',
    wip: true,
  },
  {
    id: 'slide',
    label: 'Slides',
    icon: LayoutGrid,
    description: 'Veja todos os slides juntos e ajuste notas e fundo de cada um.',
  },
  {
    id: 'integration',
    label: 'Integração',
    icon: PlugZap,
    description: 'Conecte a apresentação a outros serviços.',
    wip: true,
  },
  {
    id: 'presentation',
    label: 'Apresentação',
    icon: Presentation,
    description: 'Exibe a apresentação em tela cheia.',
    shortcut: 'F5',
  },
];

export function TopBar() {
  const { deck, dirty, savedAt } = useDeckStore();
  const workspace = useUIStore((state) => state.workspace);
  const setWorkspace = useUIStore((state) => state.setWorkspace);

  const status = dirty
    ? 'Alterações pendentes…'
    : savedAt
      ? `Rascunho salvo ${new Date(savedAt).toLocaleTimeString('pt-BR')}`
      : `${deck.slides.length} slide${deck.slides.length !== 1 ? 's' : ''}`;

  return (
    <header
      id="top"
      className="relative flex h-10 shrink-0 items-center gap-3 border-b border-payday-border bg-[#0f0f10] px-2"
    >
      <AppMenu />

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
        <span className="text-[11px] font-semibold tracking-[0.2em] text-payday-textMuted">
          MASTERMIND
        </span>
      </div>

      <nav
        role="tablist"
        aria-label="Áreas de trabalho"
        className="absolute left-1/2 flex h-full -translate-x-1/2 items-end gap-0.5"
      >
        {WORKSPACES.map((item) => {
          const active = workspace === item.id;
          const Icon = item.icon;
          return (
            <Tooltip
              key={item.id}
              title={item.label}
              description={
                item.id === 'integration'
                  ? `${item.description} Em breve.`
                  : item.wip
                    ? `${item.description} Em desenvolvimento.`
                    : item.description
              }
              shortcut={item.shortcut}
              side="bottom"
              className="h-full items-end"
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setWorkspace(item.id)}
                className={clsx(
                  'flex h-8 items-center gap-1.5 rounded-t-md border border-b-0 px-3.5 text-xs transition',
                  active
                    ? 'border-payday-border bg-payday-bg text-payday-text'
                    : 'border-transparent text-payday-textMuted hover:bg-white/5 hover:text-payday-text'
                )}
              >
                <Icon className={clsx('h-3.5 w-3.5', active && 'text-accent')} />
                {item.label}
                {item.wip ? (
                  <span className="rounded bg-white/10 px-1 py-px text-[8px] font-semibold tracking-wide text-payday-textDim">
                    WIP
                  </span>
                ) : null}
              </button>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex-1" />
      <span
        id="saveState"
        className="min-w-0 truncate text-[11px] text-payday-textDim"
        title={`${deck.title} • ${deck.slides.length} slide${deck.slides.length !== 1 ? 's' : ''}`}
      >
        {status}
      </span>
      <span
        className="shrink-0 rounded border border-payday-border px-1.5 py-0.5 text-[10px] tabular-nums text-payday-textDim"
        title={`Mastermind versão ${APP_VERSION}`}
      >
        v{APP_VERSION}
      </span>
    </header>
  );
}
