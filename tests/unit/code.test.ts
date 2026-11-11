import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CodePackage } from '../../src/packages/code/CodePackage';
import { CodeRenderer } from '../../src/packages/code/CodeRenderer';
import type { CodeSpec } from '../../src/packages/code/CodeRenderer';
import { codeRuntime } from '../../src/packages/code/CodeRuntime';
import { buildRegistryPayload } from '../../src/packages/core/export';
import { H } from '../../src/packages/core/helper';
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

describe('code package — 5 campos únicos editáveis', () => {
  const form = CodePackage.form;

  it('possui campo "Nome do arquivo" (file) no grupo Conteúdo', () => {
    const contentGroup = form.find((g) => g.group === 'Conteúdo');
    expect(contentGroup).toBeDefined();
    const fileField = contentGroup?.fields.find((f) => f.k === 'file');
    expect(fileField).toBeDefined();
    expect(fileField?.label).toBe('Nome do arquivo');
    expect(fileField?.type).toBe('text');
  });

  it('possui campo "Etiqueta" (tag) no grupo Conteúdo', () => {
    const contentGroup = form.find((g) => g.group === 'Conteúdo');
    const tagField = contentGroup?.fields.flatMap((f) => (f.type === 'row' ? f.fields : [f])).find((f) => f?.k === 'tag');
    expect(tagField).toBeDefined();
    expect(tagField?.label).toBe('Etiqueta');
    expect(tagField?.type).toBe('text');
  });

  it('possui campo "Linguagem" (lang) no grupo Conteúdo', () => {
    const contentGroup = form.find((g) => g.group === 'Conteúdo');
    const langField = contentGroup?.fields.flatMap((f) => (f.type === 'row' ? f.fields : [f])).find((f) => f?.k === 'lang');
    expect(langField).toBeDefined();
    expect(langField?.label).toBe('Linguagem');
    expect(langField?.type).toBe('select');
    expect(langField?.options).toContainEqual(['csharp', 'C#']);
    expect(langField?.options).toContainEqual(['yaml', 'YAML']);
    expect(langField?.options).toContainEqual(['sql', 'SQL']);
  });

  it('possui campo "Código" (code) no grupo Conteúdo', () => {
    const contentGroup = form.find((g) => g.group === 'Conteúdo');
    const codeField = contentGroup?.fields.find((f) => f.k === 'code');
    expect(codeField).toBeDefined();
    expect(codeField?.label).toBe('Código');
    expect(codeField?.type).toBe('code');
    expect(codeField?.rows).toBeGreaterThanOrEqual(12);
  });

  it('possui campo "Rodapé" (note) no grupo Aparência', () => {
    const appearanceGroup = form.find((g) => g.group === 'Aparência');
    expect(appearanceGroup).toBeDefined();
    const noteField = appearanceGroup?.fields.find((f) => f.k === 'note');
    expect(noteField).toBeDefined();
    expect(noteField?.label).toBe('Rodapé (opcional)');
    expect(noteField?.type).toBe('text');
  });

  it('defaults contém todos os 5 campos únicos', () => {
    expect(defaults.file).toBeDefined();
    expect(defaults.tag).toBeDefined();
    expect(defaults.lang).toBeDefined();
    expect(defaults.code).toBeDefined();
    expect(defaults.note).toBeDefined();
  });

  it('presets contêm os campos obrigatórios (file, tag, lang, code)', () => {
    for (const preset of CodePackage.presets ?? []) {
      expect(preset.spec.file).toBeDefined();
      expect(preset.spec.tag).toBeDefined();
      expect(preset.spec.lang).toBeDefined();
      expect(preset.spec.code).toBeDefined();
    }
  });

  it('CodeRenderer renderiza file, tag, code e note corretamente', () => {
    const spec: CodeSpec = {
      ...defaults,
      file: 'MeuArquivo.cs',
      tag: 'C#',
      lang: 'csharp',
      code: 'Console.WriteLine("Olá");',
      note: 'Rodapé de exemplo',
      titlebar: true,
      typing: false,
    };

    const { container } = render(React.createElement(CodeRenderer, { spec, h: H }));

    expect(container.querySelector('.pk-file')?.textContent).toBe('MeuArquivo.cs');
    expect(container.querySelector('.pk-tag')?.textContent).toBe('C#');
    expect(container.querySelector('.pk-note')?.textContent).toBe('Rodapé de exemplo');
    expect(container.querySelector('.pk-pre')?.textContent).toContain('Console.WriteLine');
  });
});
