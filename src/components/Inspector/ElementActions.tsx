import { ArrowUp, Copy, Trash2 } from 'lucide-react';

import { getActiveBridge } from '../../editor/bridgeRef';

const buttonClass =
  'grid h-7 w-7 place-items-center rounded-md border border-payday-border text-payday-textMuted transition hover:border-gold-DEFAULT/50 hover:bg-gold-DEFAULT/10 hover:text-gold-DEFAULT';

/** Ações rápidas sobre o elemento selecionado (executadas dentro do palco). */
export function ElementActions() {
  return (
    <div className="flex shrink-0 gap-1" role="toolbar" aria-label="Ações do elemento">
      <button
        type="button"
        className={buttonClass}
        title="Selecionar o elemento pai"
        aria-label="Selecionar o elemento pai"
        onClick={() => getActiveBridge()?.command('parent')}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Duplicar (Ctrl+D)"
        aria-label="Duplicar elemento"
        onClick={() => getActiveBridge()?.command('duplicate')}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={`${buttonClass} hover:!border-red-400/60 hover:!bg-red-500/15 hover:!text-red-300`}
        title="Excluir (Del)"
        aria-label="Excluir elemento"
        onClick={() => getActiveBridge()?.command('delete')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
