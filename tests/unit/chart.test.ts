import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ChartPackage } from '../../src/packages/chart/ChartPackage';
import { ChartRenderer, type ChartSpec } from '../../src/packages/chart/ChartRenderer';
import { chartRuntime } from '../../src/packages/chart/ChartRuntime';
import { buildRegistryPayload } from '../../src/packages/core/export';
import { H } from '../../src/packages/core/helper';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import type { RuntimeAPI } from '../../src/packages/core/types';

const defaults: ChartSpec = {
  kind: 'bar',
  title: '',
  rows: [
    { label: 'a', val: '5' },
    { label: 'b', val: '8' },
  ],
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

describe('chart renderer — posicionamento', () => {
  it('distribui os segmentos do donut a partir do topo, sem sobrepor', () => {
    const spec: ChartSpec = {
      ...defaults,
      kind: 'donut',
      rows: [
        { label: 'a', val: '3' },
        { label: 'b', val: '5' },
        { label: 'c', val: '2' },
      ],
    };
    const html = renderToStaticMarkup(ChartRenderer({ spec, h: H }));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const circles = [...doc.querySelectorAll('circle')];
    const circumference = 2 * Math.PI * 120;
    const expectedFirstDash = (3 / 10) * circumference;

    expect(circles[0]?.getAttribute('stroke-dashoffset')).toBe('0');
    expect(Number(circles[1]?.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      -expectedFirstDash,
      5
    );
  });

  it('mantém margens iguais nas barras verticais', () => {
    const spec: ChartSpec = {
      ...defaults,
      rows: [
        { label: 'a', val: '3' },
        { label: 'b', val: '5' },
        { label: 'c', val: '2' },
      ],
      showValues: false,
    };
    const html = renderToStaticMarkup(ChartRenderer({ spec, h: H }));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const bars = [...doc.querySelectorAll('rect.pk-bar')];
    const first = bars[0];
    const last = bars[bars.length - 1];
    if (!first || !last) throw new Error('barras não renderizadas');

    const left = Number(first.getAttribute('x'));
    const lastRight = Number(last.getAttribute('x')) + Number(last.getAttribute('width'));
    const pad = 60;
    const width = 900;

    expect(left - pad).toBeCloseTo(width - pad - lastRight, 5);
  });
});

describe('chart package — contrato de export do runtime', () => {
  it('serializa um runtime autossuficiente: revive fora do bundle e anima', async () => {
    const registry = new PackageRegistry();
    registry.register(ChartPackage);
    const payload = JSON.parse(buildRegistryPayload(registry, ['chart'])) as {
      chart: { def: { runtime: { $fn: string } } };
    };
    const source = payload.chart.def.runtime.$fn;
    expect(typeof source).toBe('string');

    // O host do HTML standalone revive o fonte com new Function, sem acesso aos
    // módulos do bundle — o runtime precisa ser autossuficiente.
    const revived = new Function(`return (${source});`)() as unknown as typeof chartRuntime;

    const api = makeApi();
    const root = rootWithBars();
    const bar0 = root.querySelectorAll('.pk-b')[0]! as SVGElement;

    let error: unknown = null;
    let ctrl: ReturnType<typeof chartRuntime> = null;
    try {
      ctrl = revived(root, defaults, api);
    } catch (err) {
      error = err;
    }
    expect(error, `runtime revive lançou: ${String(error)}`).toBeNull();
    expect(ctrl).not.toBeNull();

    await ctrl!.play();
    expect(bar0.style.transform).toBe('scaleY(1)');
    ctrl!.final();
    expect(bar0.getAttribute('height')).toBe('40');
  });
});
