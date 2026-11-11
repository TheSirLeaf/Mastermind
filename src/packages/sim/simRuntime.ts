import type { RuntimeAPI, RuntimeController } from '../core/types';

import type { SimCursorStep, SimSpec, SimStep } from './SimSpec';

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

  const toasts = Array.isArray(spec.toasts) ? spec.toasts : [];
  const cursorConfig = {
    visible: spec.cursorVisible === true,
    x: Number.isFinite(spec.cursorX) ? spec.cursorX : 82,
    y: Number.isFinite(spec.cursorY) ? spec.cursorY : 68,
  };

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

  const cursorEl = (): HTMLElement | null => $('[data-sim-cursor]');
  const appEl = (): HTMLElement | null => $('.pk-sim-app');

  const resolveTarget = (target: string): Element | null => {
    if (target.startsWith('toast:')) {
      return root.querySelector(`[data-sim-toast="${target.slice(6)}"]`);
    }
    if (target.startsWith('button:')) {
      return root.querySelector(`[data-sim-btn="${target.slice(7)}"]`);
    }
    return root.querySelector(target);
  };

  const pointFor = (step: SimCursorStep): { x: number; y: number } | null => {
    if (typeof step.x === 'number' && typeof step.y === 'number') {
      return { x: step.x, y: step.y };
    }
    if (!step.target) return null;
    const target = resolveTarget(step.target);
    const app = appEl();
    if (!target || !app) return null;
    const ar = app.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    if (!ar.width || !ar.height) return null;
    return {
      x: ((tr.left + tr.width / 2 - ar.left) / ar.width) * 100,
      y: ((tr.top + tr.height / 2 - ar.top) / ar.height) * 100,
    };
  };

  const ripple = (point: { x: number; y: number }): void => {
    const app = appEl();
    if (!app) return;
    const dot = document.createElement('span');
    dot.className = 'pk-sim-click';
    dot.style.left = `${point.x}%`;
    dot.style.top = `${point.y}%`;
    app.appendChild(dot);
    schedule(() => dot.remove(), 520);
  };

  const moveCursor = (step: SimCursorStep): void => {
    const el = cursorEl();
    if (!el) return;
    const point = pointFor(step);
    if (!point) return;
    const duration = Math.max(0, step.duration ?? 600);
    const ease =
      step.ease === 'linear'
        ? 'linear'
        : step.ease === 'spring'
          ? 'cubic-bezier(.2,1.4,.4,1)'
          : 'cubic-bezier(.22,.61,.36,1)';
    el.style.transition = `left ${duration}ms ${ease}, top ${duration}ms ${ease}`;
    el.style.left = `${point.x}%`;
    el.style.top = `${point.y}%`;
    if (step.click) schedule(() => ripple(point), duration);
  };

  const toastEl = (id: string): HTMLElement | null =>
    root.querySelector(`[data-sim-toast="${id}"]`);

  const patchToast = (id: string, action: 'show' | 'hide' | 'click'): void => {
    const el = toastEl(id);
    if (!el) return;
    if (action === 'show') {
      el.classList.add('is-show');
      const def = toasts.find((toast) => toast.id === id);
      const autoHide = def?.autoHide ?? 0;
      if (autoHide > 0) schedule(() => el.classList.remove('is-show'), autoHide);
    }
    if (action === 'hide') el.classList.remove('is-show');
    if (action === 'click') {
      el.classList.add('is-click');
      schedule(() => el.classList.remove('is-click'), 650);
    }
  };

  const apply = (step: SimStep): void => {
    if (step.cursor) moveCursor(step.cursor);
    if (step.toast) patchToast(step.toast.id, step.toast.action);
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
    $$('[data-sim-toast]').forEach((el) => el.classList.remove('is-show', 'is-click'));
    const cursor = cursorEl();
    if (cursor) {
      cursor.style.transition = 'none';
      cursor.style.left = `${cursorConfig.x}%`;
      cursor.style.top = `${cursorConfig.y}%`;
      void cursor.offsetWidth;
      cursor.style.transition = '';
    }
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
