import type { IframeBridge } from '@packages/core/iframeBridge';

let active: IframeBridge | null = null;

/** O palco registra aqui a ponte ativa para que toolbar e atalhos a usem. */
export function setActiveBridge(bridge: IframeBridge | null): void {
  active = bridge;
}

export function getActiveBridge(): IframeBridge | null {
  return active;
}
