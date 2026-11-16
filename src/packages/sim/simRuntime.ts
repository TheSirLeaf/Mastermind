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
    // Botão da tela, de um diálogo aberto ou da lista; senão, item do menu lateral.
    const buttons = $$('[data-sim-btn]').filter((el) => el.getAttribute('data-sim-btn') === label);
    const button =
      buttons.find((el) => el.closest('[data-sim-msg].is-show')) ??
      buttons.find((el) => !el.closest('[data-sim-msg]')) ??
      buttons[0] ??
      $$('[data-sim-menu]').find((el) => el.getAttribute('data-sim-menu') === label);
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

  const showDialog = (id: string): void => {
    hideMessages();
    const box = $$('[data-sim-msg]').find((el) => el.getAttribute('data-sim-msg') === id);
    if (!box) return;
    box.classList.add('is-show');
    $('[data-sim-dim]')?.classList.add('is-show');
  };

  const ITEM_STATES = ['is-idle', 'is-run', 'is-ok', 'is-fail'];
  const setItem = (el: Element | undefined, status: string): void => {
    if (!el) return;
    if (status === 'mark') {
      el.classList.add('is-mark');
      return;
    }
    el.classList.remove(...ITEM_STATES);
    el.classList.add(`is-${status}`);
  };

  /** Número do resumo: valor final, casas decimais e o que vem depois dele (ex.: `%`). */
  const sumTarget = ((): { value: number; decimals: number; suffix: string } | null => {
    const match = /^\s*([\d.]*\d)(?:,(\d+))?(.*)$/.exec(String(spec.sumValue ?? ''));
    if (!match) return null;
    const value = parseFloat(`${(match[1] ?? '').replace(/\./g, '')}.${match[2] ?? '0'}`);
    if (!isFinite(value)) return null;
    return { value, decimals: (match[2] ?? '').length, suffix: match[3] ?? '' };
  })();
  const setSum = (progress: number): void => {
    const el = $('[data-sim-sum]');
    const bar = $('[data-sim-sumbar]');
    if (bar) bar.style.transform = `scaleX(${progress})`;
    if (!el || !sumTarget) return;
    el.textContent =
      (sumTarget.value * progress).toLocaleString('pt-BR', {
        minimumFractionDigits: sumTarget.decimals,
        maximumFractionDigits: sumTarget.decimals,
      }) + sumTarget.suffix;
  };
  const countUp = async (ms: number): Promise<void> => {
    const frames = Math.max(1, Math.round(ms / 16));
    for (let frame = 1; frame <= frames; frame += 1) {
      if (!alive()) return;
      setSum(1 - Math.pow(1 - frame / frames, 3));
      await api.wait(16);
    }
    if (alive()) setSum(1);
  };

  const runItems = async (ms: number): Promise<void> => {
    for (const el of $$('[data-sim-item]')) {
      if (!alive()) return;
      setItem(el, 'run');
      await api.wait(ms);
      if (!alive()) return;
      setItem(el, 'ok');
    }
  };

  const cellsFrom = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.map(String)
      : String(value ?? '')
          .split(';')
          .map((cell) => cell.trim())
          .filter(Boolean);

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

  const apply = async (step: SimStep): Promise<void> => {
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
        if (step.row.action === 'select') row.classList.add('is-sel');
        if (step.row.action === 'clear') row.classList.remove('is-hidden', 'is-hl', 'is-sel');
      }
    }

    if (step.note === true) $$('[data-sim-note]').forEach((el) => el.classList.add('is-on'));
    else if (typeof step.note === 'number')
      $$('[data-sim-note]')[step.note]?.classList.add('is-on');

    if (step.rollback) root.classList.add('is-rollback');
    if (step.rollback || typeof step.errLine === 'number') {
      const lines = $$('.pk-sim-ln');
      const target = lines[typeof step.errLine === 'number' ? step.errLine : lines.length - 2];
      target?.classList.add('is-err');
    }

    if (step.cell) {
      const td = $(`[data-sim-dbrow="${step.cell.row}"]`)?.children[step.cell.col];
      if (td) {
        td.textContent = step.cell.text;
        td.className = step.cell.tone ? `is-${step.cell.tone}` : '';
      }
    }

    if (step.items) $$('[data-sim-item]').forEach((el) => setItem(el, String(step.items)));
    if (step.item) setItem($$('[data-sim-item]')[step.item.index], step.item.status);

    if (step.message) showMessage(step.message);
    if (step.dialog) showDialog(step.dialog);
    if (step.hideMessage) hideMessages();

    if (typeof step.runItems === 'number') await runItems(step.runItems);
    if (typeof step.count === 'number') await countUp(step.count);
  };

  const runSteps = async (list: SimStep[]): Promise<void> => {
    for (const step of list) {
      if (!alive()) return;
      if (step.wait) await api.wait(step.wait);
      if (!alive()) return;
      await apply(step);
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
    // Só volta ao começo o que o roteiro vai mexer; o resto fica como no estado final.
    const uses = (test: (step: SimStep) => boolean): boolean => steps.some(test);
    if (uses((s) => typeof s.valid === 'boolean')) $('[data-sim-valid]')?.classList.remove('is-on');
    $$('[data-sim-row]').forEach((row) => {
      if (row.classList.contains('is-new')) row.classList.add('is-hidden');
      if (row.classList.contains('is-out')) row.classList.remove('is-hidden');
      row.classList.remove('is-hl');
    });
    if (uses((s) => Array.isArray(s.chips))) {
      $$('[data-sim-chip]').forEach((chip) => {
        chip.classList.remove('is-ok', 'is-fail', 'is-undo');
        chip.classList.add('is-pending');
      });
    }
    const state = $('[data-sim-state]');
    if (state && uses((s) => s.state !== undefined)) {
      state.textContent = typeof spec.txStateStart === 'string' ? spec.txStateStart : '—';
      state.className = 'pk-sim-tx-state is-idle';
    }
    if (uses((s) => s.note !== undefined && s.note !== false)) {
      $$('[data-sim-note]').forEach((el) => el.classList.remove('is-on'));
    }
    if (uses((s) => !!s.item || !!s.items || typeof s.runItems === 'number')) {
      $$('[data-sim-item]').forEach((el) => setItem(el, 'idle'));
    }
    if (uses((s) => typeof s.count === 'number')) setSum(0);
    (Array.isArray(spec.dbRows) ? spec.dbRows : []).forEach((row, index) => {
      const el = $(`[data-sim-dbrow="${index}"]`);
      const start = cellsFrom(row?.start);
      if (!el || !start.length) return;
      Array.from(el.children).forEach((td, col) => {
        if (typeof start[col] === 'string') td.textContent = start[col] ?? '';
      });
    });
    hideMessages();
  };

  const typeCode = async (): Promise<void> => {
    const lines = $$('.pk-sim-ln');
    if (!spec.codeTyping || !lines.length) return;
    const grouped = new Map<number, SimStep[]>();
    for (const step of steps) {
      if (typeof step.at !== 'number') continue;
      const list = grouped.get(step.at) ?? [];
      list.push(step);
      grouped.set(step.at, list);
    }

    // Cada caractere vira um <span> escondido: o painel já ocupa o tamanho final,
    // o realce de sintaxe continua intacto e nada é reescrito durante a digitação.
    const chars: { el: HTMLElement; ch: string }[][] = lines.map((line) => {
      const out: { el: HTMLElement; ch: string }[] = [];
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node = walker.nextNode();
      while (node) {
        nodes.push(node as Text);
        node = walker.nextNode();
      }
      nodes.forEach((textNode) => {
        const fragment = document.createDocumentFragment();
        Array.from(textNode.nodeValue ?? '').forEach((ch) => {
          const span = document.createElement('span');
          span.className = 'pk-sim-h';
          span.textContent = ch;
          fragment.appendChild(span);
          out.push({ el: span, ch });
        });
        textNode.parentNode?.replaceChild(fragment, textNode);
      });
      return out;
    });

    const caret = spec.codeCaret === false ? null : document.createElement('span');
    if (caret) caret.className = 'pk-sim-caret';
    const base = 1000 / Math.max(10, spec.codeCps);
    let seed = 11;

    await api.wait(spec.codeDelay);
    for (let index = 0; index < lines.length; index += 1) {
      if (!alive()) return;
      const line = lines[index];
      const items = chars[index] ?? [];
      if (!line) continue;
      line.classList.add('is-cur');
      if (index > 0) await api.wait(base * 3.2);
      let leading = true;
      for (const item of items) {
        if (!alive()) return;
        item.el.className = '';
        if (caret) {
          const next = item.el.nextSibling;
          if (next) item.el.parentNode?.insertBefore(caret, next);
          else item.el.parentNode?.appendChild(caret);
        }
        if (leading && /\s/.test(item.ch)) continue;
        leading = false;
        seed = (seed * 9301 + 49297) % 233280;
        await api.wait(base * (0.55 + (0.9 * seed) / 233280));
      }
      if (!items.length && caret) line.appendChild(caret);
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
