// components/Layout/AppMenu.tsx
// Menu "hambúrguer" no canto esquerdo (como no Blender): Arquivo, Editar, Visualizar.
import type { BridgeCommand } from '@packages/core/iframeBridge';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';
import { clsx } from 'clsx';
import { ChevronRight, Menu } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import {
  confirmDiscard,
  exportWord,
  importPackageFile,
  openDeckFile,
  openPDF,
  saveHTML,
} from '../../editor/actions';
import { getActiveBridge } from '../../editor/bridgeRef';
import { Tooltip } from '../common/Tooltip';

interface Item {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  onSelect?: () => void;
}
type Entry = Item | 'separator';
interface Group {
  label: string;
  entries: Entry[];
}

export function AppMenu() {
  const [open, setOpenState] = useState(false);
  const setOpen = (value: boolean | ((was: boolean) => boolean)) => {
    setOpenState(value);
    setActive(null);
  };
  const [active, setActive] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const deckInputRef = useRef<HTMLInputElement>(null);
  const pkgInputRef = useRef<HTMLInputElement>(null);

  const { canUndo, canRedo, undo, redo, selection } = useDeckStore();
  const ui = useUIStore();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const command = (name: BridgeCommand) => () => getActiveBridge()?.command(name);

  const togglePreview = () => {
    if (ui.isPreviewMode) {
      ui.setPreviewMode(false);
      return;
    }
    ui.setPresenting(false);
    ui.setPreviewMode(true);
  };

  const groups: Group[] = [
    {
      label: 'Arquivo',
      entries: [
        {
          label: 'Nova apresentação',
          onSelect: () => {
            if (confirmDiscard()) useUIStore.getState().openNewSlide('deck');
          },
        },
        { label: 'Abrir…', onSelect: () => deckInputRef.current?.click() },
        { label: 'Salvar (HTML)', shortcut: 'Ctrl+S', onSelect: () => void saveHTML() },
        'separator',
        { label: 'Exportar para PDF', onSelect: () => void openPDF() },
        { label: 'Exportar para Word (.doc)', onSelect: () => exportWord() },
        'separator',
        { label: 'Gerenciador de pacotes…', onSelect: () => ui.openPackageManager() },
        { label: 'Importar pacote…', onSelect: () => pkgInputRef.current?.click() },
        'separator',
        { label: 'Configurações…', onSelect: () => ui.openSettings() },
      ],
    },
    {
      label: 'Editar',
      entries: [
        { label: 'Desfazer', shortcut: 'Ctrl+Z', disabled: !canUndo, onSelect: undo },
        { label: 'Refazer', shortcut: 'Ctrl+Y', disabled: !canRedo, onSelect: redo },
        'separator',
        {
          label: 'Duplicar',
          shortcut: 'Ctrl+D',
          disabled: !selection,
          onSelect: command('duplicate'),
        },
        { label: 'Excluir', shortcut: 'Del', disabled: !selection, onSelect: command('delete') },
        'separator',
        { label: 'Selecionar elemento pai', disabled: !selection, onSelect: command('parent') },
        { label: 'Trazer para a frente', disabled: !selection, onSelect: command('front') },
        { label: 'Enviar para trás', disabled: !selection, onSelect: command('back') },
        { label: 'Redefinir posição e tamanho', disabled: !selection, onSelect: command('reset') },
      ],
    },
    {
      label: 'Visualizar',
      entries: [
        { label: 'Pré-visualizar animações', checked: ui.isPreviewMode, onSelect: togglePreview },
        {
          label: 'Apresentar',
          shortcut: 'F5',
          onSelect: () => ui.setWorkspace('presentation'),
        },
        'separator',
        { label: 'Painel de slides', checked: ui.showLeftPanel, onSelect: ui.toggleLeftPanel },
        {
          label: 'Painel de propriedades',
          checked: ui.showRightPanel,
          onSelect: ui.toggleRightPanel,
        },
      ],
    },
  ];

  const handleDeckFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !confirmDiscard()) return;
    await openDeckFile(file);
  };
  const handlePackageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await importPackageFile(file);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={deckInputRef}
        type="file"
        accept=".html,text/html"
        className="hidden"
        onChange={handleDeckFile}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={pkgInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handlePackageFile}
        aria-hidden="true"
        tabIndex={-1}
      />
      <Tooltip
        title="Menu"
        description="Arquivo, Editar e Visualizar"
        side="bottom"
        disabled={open}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Menu principal"
          onClick={() => setOpen((value) => !value)}
          className={clsx(
            'grid h-8 w-8 place-items-center rounded-md transition',
            open
              ? 'bg-accent/15 text-accent'
              : 'text-payday-textMuted hover:bg-white/10 hover:text-payday-text'
          )}
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
      </Tooltip>

      {open ? (
        <div
          role="menu"
          className="mm-menu-in absolute left-0 top-full z-[70] mt-1.5 w-44 rounded-xl border border-white/10 bg-[#1b1b1d] p-1.5 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.75)]"
        >
          {groups.map((group) => {
            const expanded = active === group.label;
            return (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => setActive(group.label)}
              >
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={() => setActive(expanded ? null : group.label)}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition',
                    expanded ? 'bg-accent/15 text-accent' : 'text-payday-text hover:bg-white/5'
                  )}
                >
                  {group.label}
                  <ChevronRight className="h-3 w-3 opacity-60" />
                </button>
                {expanded ? (
                  <div
                    role="menu"
                    className="mm-submenu-in absolute left-full top-[-6px] ml-1.5 min-w-[260px] rounded-xl border border-white/10 bg-[#1b1b1d] p-1.5 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.75)]"
                  >
                    {group.entries.map((entry, index) =>
                      entry === 'separator' ? (
                        <hr key={`sep-${index}`} className="my-1 border-white/10" />
                      ) : (
                        <button
                          key={entry.label}
                          type="button"
                          role="menuitem"
                          disabled={entry.disabled}
                          onClick={() => {
                            setOpen(false);
                            entry.onSelect?.();
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-left text-xs text-payday-text transition hover:bg-accent/15 disabled:pointer-events-none disabled:opacity-35"
                        >
                          <span className="w-3 text-accent">{entry.checked ? '✓' : ''}</span>
                          <span className="flex-1">{entry.label}</span>
                          {entry.shortcut ? (
                            <kbd className="font-mono text-[10px] text-payday-textDim">
                              {entry.shortcut}
                            </kbd>
                          ) : null}
                        </button>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
