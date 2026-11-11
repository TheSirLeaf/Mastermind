import type { RuntimeAPI, RuntimeController } from '../core/types';

import type { SimSpec, SimStep } from './SimSpec';

/**
 * Runtime do pacote `sim`.
 *
 * É serializado para o HTML exportado, então não pode referenciar nada fora do
 * próprio corpo (helpers, constantes ou imports).
 */
export function simRuntime(
  root: HTMLElement,
  spec: SimSpec,
  api: RuntimeAPI
): RuntimeController | null {
  const original = root.innerHTML;
  const timers: number[] = [];
  let cancelled = false;

  const $ = <T extends Element = HTMLElement>(selector: string): T | null =>
    root.querySelector<T>(selector);
  const $$ = <T extends Element = HTMLElement>(selector: string): T[] =>
    Array.from(root.querySelectorAll<T>(selector));
  const alive = (): boolean => !cancelled && api.alive();

  const steps: SimStep[] = Array.isArray(spec.steps)
    ? spec.steps
    : (() => {
        try {
          const parsed: unknown = JSON.parse(String(spec.steps || '[]'));
          return Array.isArray(parsed) ? (parsed as SimStep[]) : [];
        } catch {
          return [];
        }
      })();

  const schedule = (fn: () => void, ms: number): void => {
    const timer = window.setTimeout(fn, ms);
    timers.push(timer);
  };

  const clearTimers = (): void => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.length = 0;
  };

  const hideMessages = (): void => {
    $$('[data-sim-msg]').forEach((el) => el.classList.remove('is-show'));
    $('[data-sim-dim]')?.classList.remove('is-show');
  };

  const press = (label: string): void => {
    const button = $$('[data-sim-btn]').find((el) => el.getAttribute('data-sim-btn') === label);
    if (!button) return;
    button.classList.add('is-press');
    schedule(() => button.classList.remove('is-press'), 480);
  };

  const showMessage = (kind: 'success' | 'error' | 'confirm'): void => {
    hideMessages();
    const box = $(`[data-sim-msg="${kind}"]`);
    if (!box) return;
    box.classList.add('is-show');
    $('[data-sim-dim]')?.classList.add('is-show');
    if (kind === 'confirm') return;
    schedule(hideMessages, kind === 'success' ? 2300 : 3400);
  };

  const apply = (step: SimStep): void => {
    if (step.press) press(step.press);

    if (typeof step.valid === 'boolean') {
      $('[data-sim-valid]')?.classList.toggle('is-on', step.valid);
    }

    if (step.state !== undefined) {
      const state = $('[data-sim-state]');
      if (state) {
        state.textContent = step.state;
        state.className = `pk-sim-tx-state${step.stateTone ? ` is-${step.stateTone}` : ''}`;
      }
    }

    if (step.chips) {
      $$('[data-sim-chip]').forEach((chip, index) => {
        const action = step.chips?.[index] ?? 'pending';
        chip.classList.remove('is-ok', 'is-fail', 'is-undo', 'is-pending');
        chip.classList.add(`is-${action}`);
      });
    }

    if (step.chipDetails) {
      $$('[data-sim-chip] span').forEach((detail, index) => {
        const text = step.chipDetails?.[index];
        if (typeof text === 'string') detail.textContent = text;
      });
    }

    if (step.row) {
      const row = $(`[data-sim-row="${step.row.index}"]`);
      if (row) {
        if (step.row.action === 'show') row.classList.remove('is-hidden');
        if (step.row.action === 'hide') row.classList.add('is-hidden');
        if (step.row.action === 'highlight') row.classList.add('is-hl');
        if (step.row.action === 'clear') row.classList.remove('is-hidden', 'is-hl');
      }
    }

    if (step.note) $('[data-sim-note]')?.classList.add('is-on');

    if (step.rollback) {
      root.classList.add('is-rollback');
      const lines = $$('.pk-sim-ln');
      const target = lines[lines.length - 2];
      target?.classList.add('is-err');
    }

    if (step.message) showMessage(step.message);
    if (step.hideMessage) hideMessages();
  };

  const runSteps = async (list: SimStep[]): Promise<void> => {
    for (const step of list) {
      if (!alive()) return;
      if (step.wait) await api.wait(step.wait);
      if (!alive()) return;
      apply(step);
    }
  };

  const reset = (): void => {
    root.classList.add('is-running');
    $('[data-sim-valid]')?.classList.remove('is-on');
    $$('[data-sim-row]').forEach((row) => {
      if (row.classList.contains('is-new')) row.classList.add('is-hidden');
      row.classList.remove('is-hl');
    });
    $$('[data-sim-chip]').forEach((chip) => {
      chip.classList.remove('is-ok', 'is-fail', 'is-undo');
      chip.classList.add('is-pending');
    });
    const state = $('[data-sim-state]');
    if (state) {
      state.textContent = '—';
      state.className = 'pk-sim-tx-state';
    }
    $('[data-sim-note]')?.classList.remove('is-on');
    hideMessages();
  };

  const typeCode = async (): Promise<void> => {
    if (!spec.codeEnabled || !spec.codeTyping) return;
    const lines = $$('.pk-sim-ln');
    if (!lines.length) return;
    const html = lines.map((line) => line.innerHTML);
    const text = lines.map((line) => line.textContent ?? '');
    const grouped = new Map<number, SimStep[]>();
    for (const step of steps) {
      if (typeof step.at !== 'number') continue;
      const list = grouped.get(step.at) ?? [];
      list.push(step);
      grouped.set(step.at, list);
    }

    lines.forEach((line) => {
      line.textContent = '';
    });
    await api.wait(spec.codeDelay);
    const perChar = 1000 / Math.max(10, spec.codeCps);

    for (let index = 0; index < lines.length; index += 1) {
      if (!alive()) return;
      const line = lines[index];
      if (!line) continue;
      const source = text[index] ?? '';
      line.classList.add('is-cur');
      for (const char of source) {
        if (!alive()) return;
        line.textContent += char;
        await api.wait(perChar);
      }
      line.innerHTML = html[index] ?? '';
      line.classList.remove('is-cur');
      const lineSteps = grouped.get(index);
      if (lineSteps) await runSteps(lineSteps);
    }
  };

  return {
    play: async () => {
      if (api.reduced) return;
      clearTimers();
      cancelled = false;
      root.innerHTML = original;
      reset();
      await typeCode();
      if (!alive()) return;
      await runSteps(steps.filter((step) => typeof step.at !== 'number'));
    },
    final: () => {
      cancelled = true;
      clearTimers();
      root.classList.remove('is-running', 'is-rollback');
      root.innerHTML = original;
    },
  };
}
