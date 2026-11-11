import { describe, expect, it, vi } from 'vitest';

import { CodePackage } from '../../src/packages/code/CodePackage';
import type { CodeSpec } from '../../src/packages/code/CodeRenderer';
import { codeRuntime } from '../../src/packages/code/CodeRuntime';
import { buildRegistryPayload } from '../../src/packages/core/export';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import type { RuntimeAPI } from '../../src/packages/core/types';

const defaults: CodeSpec = {
  file: 'x.cs',
  tag: 'C#',
  lang: 'csharp',
  code: 'ab\ncd',
  theme: 'dark',
  fontSize: 24,
  lineHeight: 1.7,
  titlebar: true,
  note: '',
  hl: '',
  lineGlow: false,
  typing: true,
  cps: 1000,
  delay: 0,
  caret: false,
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

function rootWith(lines: string[]): HTMLElement {
  const pre = document.createElement('pre');
  pre.className = 'pk-pre';
  for (const line of lines) {
    const ln = document.createElement('span');
    ln.className = 'pk-ln';
    ln.textContent = line;
    pre.appendChild(ln);
  }
  const root = document.createElement('div');
  root.appendChild(pre);
  return root;
}

describe('code runtime', () => {
  it('returns null when there is no pre.pk-pre', () => {
    const root = document.createElement('div');
    expect(codeRuntime(root, defaults, makeApi())).toBeNull();
  });

  it('types code into each line and final restores original HTML', async () => {
    const api = makeApi();
    const root = rootWith(['ab', 'cd']);
    const pre = root.querySelector('pre.pk-pre')!;
    const original = pre.innerHTML;

    const ctrl = codeRuntime(root, defaults, api);
    expect(ctrl).not.toBeNull();
    await ctrl!.play();

    expect(pre.textContent).toBe('abcd');
    expect(api.wait).toHaveBeenCalled();

    ctrl!.final();
    expect(pre.innerHTML).toBe(original);
  });

  it('does not type when api.reduced', async () => {
    const api = makeApi({ reduced: true });
    const root = rootWith(['ab']);
    const pre = root.querySelector('pre.pk-pre')!;
    const original = pre.innerHTML;

    const ctrl = codeRuntime(root, { ...defaults, typing: true }, api);
    expect(ctrl).not.toBeNull();
    await ctrl!.play();

    expect(pre.innerHTML).toBe(original);
    expect(api.wait).not.toHaveBeenCalled();
  });

  it('stops typing when api.alive becomes false', async () => {
    let alive = true;
    const api = makeApi({ alive: () => alive });
    const root = rootWith(['abcdef']);
    const pre = root.querySelector('pre.pk-pre')!;

    const ctrl = codeRuntime(root, { ...defaults, typing: true, cps: 1 }, api);
    expect(ctrl).not.toBeNull();
    const playPromise = ctrl!.play();
    alive = false;
    await playPromise;

    expect(pre.textContent.length).toBeLessThan('abcdef'.length);
  });

  it('play does nothing and final restores when typing is disabled', async () => {
    const api = makeApi();
    const root = rootWith(['ab']);
    const pre = root.querySelector('pre.pk-pre')!;
    const original = pre.innerHTML;

    const ctrl = codeRuntime(root, { ...defaults, typing: false }, api);
    expect(ctrl).not.toBeNull();
    await ctrl!.play();

    expect(pre.innerHTML).toBe(original);
    ctrl!.final();
    expect(pre.innerHTML).toBe(original);
  });
});

describe('code package — contrato de export do runtime', () => {
  it('serializa um runtime autossuficiente: revive fora do bundle e digita', async () => {
    const registry = new PackageRegistry();
    registry.register(CodePackage);
    const payload = JSON.parse(buildRegistryPayload(registry, ['code'])) as {
      code: { def: { runtime: { $fn: string } } };
    };
    const source = payload.code.def.runtime.$fn;
    expect(typeof source).toBe('string');

    // O host do HTML standalone revive o fonte com new Function, sem acesso aos
    // módulos do bundle — o runtime precisa ser autossuficiente.
    const revived = new Function(`return (${source});`)() as unknown as typeof codeRuntime;

    const api = makeApi();
    const root = rootWith(['int x = 1;', 'int y = 2;']);
    const pre = root.querySelector('pre.pk-pre')!;
    const original = pre.innerHTML;

    let error: unknown = null;
    let ctrl: ReturnType<typeof codeRuntime> = null;
    try {
      ctrl = revived(root, defaults, api);
    } catch (err) {
      error = err;
    }
    expect(error, `runtime revive lançou: ${String(error)}`).toBeNull();
    expect(ctrl).not.toBeNull();

    await ctrl!.play();
    expect(pre.textContent).toBe('int x = 1;int y = 2;');
    ctrl!.final();
    expect(pre.innerHTML).toBe(original);
  });
});
