import { afterEach, describe, expect, it, vi } from 'vitest';

import { IframeBridge } from '../../src/packages/core/iframeBridge';

function setup(): {
  bridge: IframeBridge;
  post: ReturnType<typeof vi.spyOn>;
  iframe: HTMLIFrameElement;
} {
  const iframe = document.createElement('iframe');
  Object.defineProperty(iframe, 'contentWindow', {
    configurable: true,
    value: window,
  });
  const post = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
  const bridge = new IframeBridge(iframe, {});
  return { bridge, post, iframe };
}

function ready(): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { __mm: 'deck', type: 'ready', count: 2 },
      source: window,
    })
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IframeBridge', () => {
  it('enfileira o goto inicial até o iframe ficar pronto', () => {
    const { bridge, post } = setup();

    bridge.load('<html></html>');
    bridge.goto(0);
    expect(post).not.toHaveBeenCalled();

    ready();
    expect(post).toHaveBeenCalledWith({ __mm: 'editor', type: 'goto', index: 0 }, '*');

    bridge.destroy();
  });

  it('envia o goto imediatamente depois do ready', () => {
    const { bridge, post } = setup();
    bridge.load('<html></html>');
    ready();
    post.mockClear();

    bridge.goto(1);
    expect(post).toHaveBeenCalledWith({ __mm: 'editor', type: 'goto', index: 1 }, '*');

    bridge.destroy();
  });

  it('envia a seleção pendente depois do goto', () => {
    const { bridge, post } = setup();
    bridge.load('<html></html>');
    bridge.goto(1);
    bridge.select([1, 2]);

    ready();

    expect(post).toHaveBeenNthCalledWith(1, { __mm: 'editor', type: 'goto', index: 1 }, '*');
    expect(post).toHaveBeenNthCalledWith(2, { __mm: 'editor', type: 'select', path: [1, 2] }, '*');

    bridge.destroy();
  });
});
