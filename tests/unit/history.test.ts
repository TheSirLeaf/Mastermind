import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { HistoryManager } from '../../src/packages/core/history';

interface State {
  value: number;
}

const clone = (state: State): State => ({ ...state });

describe('HistoryManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('começa sem undo nem redo', () => {
    const history = new HistoryManager<State>(clone);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it('restaura o snapshot anterior', () => {
    const history = new HistoryManager<State>(clone);
    let state = { value: 1 };
    history.push(state);
    state = { value: 2 };

    const previous = history.undo(state);
    expect(previous).toEqual({ value: 1 });
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);

    const next = history.redo(previous!);
    expect(next).toEqual({ value: 2 });
    expect(history.canUndo).toBe(true);
  });

  it('agrupa edições com a mesma chave dentro da janela', () => {
    const history = new HistoryManager<State>(clone, { coalesceMs: 500 });
    const state = { value: 0 };

    history.push(state, 'typing');
    vi.advanceTimersByTime(100);
    history.push({ value: 1 }, 'typing');
    vi.advanceTimersByTime(100);
    history.push({ value: 2 }, 'typing');

    expect(history.depth).toBe(1);
  });

  it('quebra a coalescência após a janela', () => {
    const history = new HistoryManager<State>(clone, { coalesceMs: 500 });
    history.push({ value: 0 }, 'typing');
    vi.advanceTimersByTime(600);
    history.push({ value: 1 }, 'typing');
    expect(history.depth).toBe(2);
  });

  it('descarta o redo ao registrar novo estado', () => {
    const history = new HistoryManager<State>(clone);
    history.push({ value: 0 });
    const previous = history.undo({ value: 1 });
    expect(history.canRedo).toBe(true);
    history.push(previous!);
    expect(history.canRedo).toBe(false);
  });

  it('respeita o limite de snapshots', () => {
    const history = new HistoryManager<State>(clone, { limit: 3, coalesceMs: 0 });
    for (let i = 0; i < 10; i++) {
      history.push({ value: i });
      vi.advanceTimersByTime(1);
    }
    expect(history.depth).toBe(3);
  });

  it('não restaura nada quando o histórico está vazio', () => {
    const history = new HistoryManager<State>(clone);
    expect(history.undo({ value: 1 })).toBeNull();
    expect(history.redo({ value: 1 })).toBeNull();
  });
});
