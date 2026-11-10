/**
 * Gerenciador de histórico baseado em snapshots.
 *
 * O editor guarda HTML de slides; snapshots são imutáveis e clonados
 * defensivamente, então o custo é proporcional ao tamanho do deck.
 */
export interface HistoryOptions {
  /** Máximo de snapshots no passado. */
  limit?: number;
  /** Janela de coalescência para edições contínuas (ms). */
  coalesceMs?: number;
}

export class HistoryManager<T> {
  private past: T[] = [];
  private future: T[] = [];
  private lastKey: string | null = null;
  private lastAt = 0;
  private readonly limit: number;
  private readonly coalesceMs: number;

  constructor(
    private readonly clone: (value: T) => T,
    options: HistoryOptions = {}
  ) {
    this.limit = options.limit ?? 80;
    this.coalesceMs = options.coalesceMs ?? 600;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Número de estados no histórico (útil para debug/testes). */
  get depth(): number {
    return this.past.length;
  }

  /**
   * Registra o estado atual antes de uma mutação.
   * `key` permite agrupar edições próximas (ex.: digitação) em um só passo.
   */
  push(state: T, key?: string): void {
    const now = Date.now();
    if (key && this.lastKey === key && now - this.lastAt < this.coalesceMs) {
      this.lastAt = now;
      this.future = [];
      return;
    }
    this.past.push(this.clone(state));
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    this.lastKey = key ?? null;
    this.lastAt = now;
  }

  /** Remove o último snapshot sem restaurá-lo (ex.: operação cancelada). */
  dropLast(): void {
    this.past.pop();
  }

  undo(current: T): T | null {
    const previous = this.past.pop();
    if (previous === undefined) return null;
    this.future.push(this.clone(current));
    this.lastKey = null;
    this.lastAt = 0;
    return previous;
  }

  redo(current: T): T | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(this.clone(current));
    this.lastKey = null;
    this.lastAt = 0;
    return next;
  }

  /** Zera o histórico (ex.: ao abrir outro deck). */
  reset(): void {
    this.past = [];
    this.future = [];
    this.lastKey = null;
    this.lastAt = 0;
  }

  /** Interrompe a coalescência para que a próxima edição seja um novo passo. */
  breakCoalescing(): void {
    this.lastKey = null;
    this.lastAt = 0;
  }
}
