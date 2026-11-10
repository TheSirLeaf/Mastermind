import { describe, expect, it, vi } from 'vitest';

import type { ChartSpec } from '../../src/packages/chart/ChartRenderer';
import { chartRuntime } from '../../src/packages/chart/ChartRuntime';
import type { RuntimeAPI } from '../../src/packages/core/types';

const defaults: ChartSpec = {
  kind: 'bar',
  title: '',
  rows: [{ label: 'a', val: '5' }, { label: 'b', val: '8' }],
  color: '#C77C8A',
  hlColor: '#F7D98B',
  max: '',
  suffix: '',
  decimals: 0,
  showValues: true,
  grid: false,
  animate: true,
  countUp: false,
  delay: 0,
  w: 900,
};

function makeApi(overrides: Partial<RuntimeAPI> = {}): RuntimeAPI {
  return {
    reduced: false,
    alive: () => true,
    wait: vi.fn().mockResolvedValue(undefined),
    frame: vi.fn(),
    ...overrides,
  } as RuntimeAPI;
}

function rootWithBars(count = 2): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (let i = 0; i < count; i++) {
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('class', 'pk-b pk-bar');
    bar.setAttribute('data-h', String(40 + i * 10));
    bar.setAttribute('height', String(40 + i * 10));
    svg.appendChild(bar);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'pk-cv pk-bar-v');
    text.textContent = String(10 + i * 5);
    svg.appendChild(text);
  }
  const root = document.createElement('div');
  root.appendChild(svg);
  return root;
}

describe('chart runtime', () => {
  it('returns null when animate is disabled', () => {
    const root = rootWithBars();
    expect(chartRuntime(root, { ...defaults, animate: false }, makeApi())).toBeNull();
  });

  it('returns null when api.reduced', () => {
    const root = rootWithBars();
    expect(chartRuntime(root, defaults, makeApi({ reduced: true }))).toBeNull();
  });

  it('scales bars from 0 to 1 on play and final restores heights', async () => {
    const api = makeApi();
    const root = rootWithBars();
    const bars = root.querySelectorAll('.pk-b');
    const bar0 = bars[0]! as SVGElement;
    const ctrl = chartRuntime(root, defaults, api);
    expect(ctrl).not.toBeNull();
    await ctrl!.play();

    expect(bar0.style.transform).toBe('scaleY(1)');
    expect(bar0.style.opacity).toBe('1');

    ctrl!.final();
    expect(bar0.style.transform).toBe('');
    expect(bar0.style.opacity).toBe('');
    expect(bar0.getAttribute('height')).toBe('40');
  });

  it('counts up values when countUp is enabled', async () => {
    let now = 0;
    const perfSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);
    const rafs: Array<(ts: number) => void> = [];
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafs.push(cb);
      return 0;
    });
    try {
      const api = makeApi();
      const root = rootWithBars();
      const text = root.querySelector('.pk-bar-v')!;
      const ctrl = chartRuntime(root, { ...defaults, countUp: true }, api)!;
      const playPromise = ctrl.play();
      await Promise.resolve();
      now = 5000;
      for (const cb of rafs) cb(now);
      await playPromise;
      expect(text.textContent).toBe('10');
    } finally {
      rafSpy.mockRestore();
      perfSpy.mockRestore();
    }
  });
});
