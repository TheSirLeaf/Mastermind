import { ArrowUp, Copy, Trash2 } from 'lucide-react';

import { getActiveBridge } from '../../editor/bridgeRef';
import { Tooltip } from '../common/Tooltip';

const buttonClass =
  'grid h-7 w-7 place-items-center rounded-md border border-payday-border text-payday-textMuted transition hover:border-accent/50 hover:bg-accent/10 hover:text-accent';

/** Ações rápidas sobre o elemento selecionado (executadas dentro do palco). */
export function ElementActions() {
  return (
    <div className="flex shrink-0 gap-1" role="toolbar" aria-label="Ações do elemento">
      <Tooltip
        title="Elemento pai"
        description="Sobe um nível na estrutura do slide."
        side="bottom"
      >
        <button
          type="button"
          className={buttonClass}
          aria-label="Selecionar o elemento pai"
          onClick={() => getActiveBridge()?.command('parent')}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <Tooltip
        title="Duplicar"
        description="Cria uma cópia do elemento."
        shortcut="Ctrl+D"
        side="bottom"
      >
        <button
          type="button"
          className={buttonClass}
          aria-label="Duplicar elemento"
          onClick={() => getActiveBridge()?.command('duplicate')}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <Tooltip
        title="Excluir"
        description="Remove o elemento, mesmo se estiver travado."
        shortcut="Del"
        side="bottom"
      >
        <button
          type="button"
          className={`${buttonClass} hover:!border-red-400/60 hover:!bg-red-500/15 hover:!text-red-300`}
          aria-label="Excluir elemento"
          onClick={() => getActiveBridge()?.command('delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}
