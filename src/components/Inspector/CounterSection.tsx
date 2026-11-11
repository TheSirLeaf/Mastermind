import { counterTarget, setCounter } from '@packages/core/counter';
import type { SelectionInfo } from '@packages/core/types';
import { useDeckStore } from '@store/deckStore';
import { useUIStore } from '@stores/uiStore';

import { mutateSelectedElement, readSelectedElement } from './elementSelection';

/** Liga a contagem animada (0 → número) em elementos cujo texto é um número. */
export function CounterSection({ selection }: { selection: SelectionInfo }) {
  // Reassina o deck para refletir a mudança de `data-count` na hora.
  useDeckStore((state) => state.deck);
  const element = readSelectedElement(selection);
  const target = element ? counterTarget(element) : null;
  if (!element || !target) return null;

  const count = target.getAttribute('data-count');
  const enabled = count !== null;

  const toggle = (checked: boolean): void => {
    let ok = true;
    mutateSelectedElement(selection, (node) => {
      const inner = counterTarget(node) ?? node;
      ok = setCounter(inner, checked);
    });
    if (!ok) {
      useUIStore
        .getState()
        .showToast('O texto desse elemento não é um número (ex.: 6.174 ou 91,2).', 'error');
    }
  };

  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gold-DEFAULT/25 bg-gold-DEFAULT/10 p-3 text-xs text-payday-text">
      <input
        type="checkbox"
        className="mt-0.5 accent-gold-DEFAULT"
        checked={enabled}
        onChange={(event) => toggle(event.target.checked)}
      />
      <span>
        Animar contagem
        <small className="mt-0.5 block text-[11px] text-payday-textMuted">
          {enabled
            ? `Conta de 0 até ${(count ?? '').replace('.', ',')} ao entrar no slide`
            : 'Mostra o número fixo, sem contagem'}
        </small>
      </span>
    </label>
  );
}
