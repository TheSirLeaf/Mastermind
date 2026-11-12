import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CodePackage } from '../../src/packages/code/CodePackage';
import { CodeRenderer } from '../../src/packages/code/CodeRenderer';
import type { CodeSpec } from '../../src/packages/code/CodeRenderer';
import { codeRuntime } from '../../src/packages/code/CodeRuntime';
import { codeTimeline, typingEnd, typingSeconds } from '../../src/packages/code/codeTimeline';
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

/** `frame` síncrono: avança o relógio em passos de 50 ms até a animação terminar. */
function makeApi(overrides: Partial<RuntimeAPI> = {}): RuntimeAPI {
  const api = {
    reduced: false,
    alive: () => true,
    wait: vi.fn().mockResolvedValue(undefined),
    frame: (fn: (ts: number) => boolean | void) => {
      let ts = 0;
      for (let guard = 0; guard < 100000 && api.alive(); guard++) {
        if (fn(ts) === false) return;
        ts += 50;
      }
    },
    ...overrides,
  } as RuntimeAPI;
  return api;
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

  it('esconde o código assim que monta (bloco vazio) e revela ao digitar', async () => {
    const api = makeApi();
    const root = rootWith(['ab', 'cd']);
    const pre = root.querySelector('pre.pk-pre')!;
    const original = pre.innerHTML;

    const ctrl = codeRuntime(root, defaults, api);
    expect(ctrl).not.toBeNull();
    // Antes de começar a digitar, nenhum caractere pode estar visível.
    expect(pre.querySelectorAll('.pk-h').length).toBe(4);

    await ctrl!.play();

    expect(pre.textContent).toBe('abcd');
    expect(pre.querySelectorAll('.pk-h').length).toBe(0);

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
    expect(pre.querySelectorAll('.pk-h').length).toBe(0);
  });

  it('stops typing when api.alive becomes false', async () => {
    let alive = true;
    const api = makeApi({ alive: () => alive });
    const root = rootWith(['abcdef']);
    const pre = root.querySelector('pre.pk-pre')!;

    const ctrl = codeRuntime(root, { ...defaults, typing: true, cps: 1 }, api);
    expect(ctrl).not.toBeNull();
    alive = false;
    await ctrl!.play();

    expect(pre.querySelectorAll('.pk-h').length).toBe('abcdef'.length);
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
    const tagField = contentGroup?.fields
      .flatMap((f) => (f.type === 'row' ? f.fields : [f]))
      .find((f) => f?.k === 'tag');
    expect(tagField).toBeDefined();
    expect(tagField?.label).toBe('Etiqueta');
    expect(tagField?.type).toBe('text');
  });

  it('possui campo "Linguagem" (lang) no grupo Conteúdo', () => {
    const contentGroup = form.find((g) => g.group === 'Conteúdo');
    const langField = contentGroup?.fields
      .flatMap((f) => (f.type === 'row' ? f.fields : [f]))
      .find((f) => f?.k === 'lang');
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

describe('code package — cursor, console, cores e numeração', () => {
  it('o cursor continua no fim depois de digitar (e some ao restaurar)', async () => {
    const root = rootWith(['ab', 'cd']);
    const ctrl = codeRuntime(root, { ...defaults, caret: true }, makeApi())!;
    await ctrl.play();
    expect(root.querySelectorAll('.pk-caret').length).toBe(1);
    ctrl.final();
    expect(root.querySelectorAll('.pk-caret').length).toBe(0);
  });

  it('sem cursor, nada é inserido', async () => {
    const root = rootWith(['ab']);
    await codeRuntime(root, { ...defaults, caret: false }, makeApi())!.play();
    expect(root.querySelectorAll('.pk-caret').length).toBe(0);
  });

  it('console revela a linha inteira de uma vez', () => {
    const root = rootWith(['abc', 'def']);
    const pre = root.querySelector('pre.pk-pre')!;
    const calls: number[] = [];
    const api = makeApi({
      frame: (fn) => {
        // 1º quadro (t=0): só a primeira linha; depois tudo.
        fn(0);
        calls.push(pre.querySelectorAll('.pk-h').length);
        for (let ts = 50; ts < 5000; ts += 50) if (fn(ts) === false) break;
        calls.push(pre.querySelectorAll('.pk-h').length);
      },
    });
    void codeRuntime(root, { ...defaults, variant: 'terminal' }, api)!.play();
    expect(calls).toEqual([3, 0]);
  });

  it('renderiza paleta, numeração e o estilo único', () => {
    const { container } = render(
      React.createElement(CodeRenderer, {
        spec: { ...defaults, palette: 'slate', lineNumbers: true, variant: 'terminal' },
        h: H,
      })
    );
    const box = container.querySelector('.pk-code') as HTMLElement;
    expect(box.className).toContain('pk-v-typing');
    expect(box.className).not.toContain('pk-v-terminal');
    expect(box.className).toContain('pk-nums');
    expect(box.className).toContain('pk-pal');
    expect(box.style.getPropertyValue('--pk-bg')).toBe('#1F2128');
  });

  it('o formulário põe "Animação" na aba Animação e cores/linhas em Aparência', () => {
    const anim = CodePackage.form.find((g) => g.workspace === 'animation');
    expect(anim?.fields.some((f) => f.k === 'variant' && f.label === 'Animação')).toBe(true);
    const look = CodePackage.form.find((g) => g.group === 'Aparência');
    expect(look?.fields.some((f) => f.k === 'lineNumbers')).toBe(true);
    expect(look?.fields.some((f) => f.k === 'palette')).toBe(true);
  });
});

describe('code package — destaques de linha na animação', () => {
  /** Quadros controlados: devolve `step(ms)` que roda o loop no instante pedido. */
  function manualApi() {
    let loop: ((ts: number) => boolean | void) | null = null;
    const api = makeApi({
      frame: (fn) => {
        loop = fn;
      },
    });
    return { api, step: (ts: number) => loop?.(ts) };
  }
  const lit = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('.pk-ln.pk-hl')).map((l) => l.textContent);

  it('nenhuma linha começa destacada; os eventos entram depois de digitar, no tempo marcado', () => {
    const root = rootWith(['aa', 'bb', 'cc']);
    root.querySelectorAll('.pk-ln').forEach((l) => l.classList.add('pk-hl')); // estado final renderizado
    const spec: CodeSpec = {
      ...defaults,
      cps: 1000,
      delay: 0,
      highlights: [
        { lines: '2', at: 1, keep: false },
        { lines: '3', at: 6, keep: true },
      ],
    };
    const { api, step } = manualApi();
    const ctrl = codeRuntime(root, spec, api)!;
    expect(lit(root)).toEqual([]); // antes de digitar, sem destaque
    void ctrl.play();
    step(0);
    step(500); // digitação já terminou (cps alto), mas o 1º evento é em +1s
    expect(lit(root)).toEqual([]);
    step(1500);
    expect(lit(root)).toEqual(['bb']);
    step(5000);
    expect(lit(root)).toEqual(['bb']);
    expect(step(7000)).toBe(false); // último evento: acabou a animação
    expect(lit(root)).toEqual(['bb', 'cc']); // "manter" acumula
  });

  it('sem digitação, os destaques contam a partir do atraso', () => {
    const root = rootWith(['aa', 'bb']);
    const spec: CodeSpec = {
      ...defaults,
      typing: false,
      delay: 200,
      highlights: [{ lines: '1', at: 0.5 }],
    };
    const { api, step } = manualApi();
    const ctrl = codeRuntime(root, spec, api)!;
    void ctrl.play();
    step(0);
    step(500);
    expect(lit(root)).toEqual([]);
    expect(step(800)).toBe(false);
    expect(lit(root)).toEqual(['aa']);
  });

  it('o campo antigo "hl" vira um destaque logo depois da digitação', () => {
    const root = rootWith(['aa', 'bb']);
    const { api, step } = manualApi();
    const ctrl = codeRuntime(root, { ...defaults, hl: '2', delay: 0, cps: 1000 }, api)!;
    void ctrl.play();
    step(0);
    step(100);
    expect(lit(root)).toEqual(['bb']);
  });

  it('o estado final (renderizado) mostra o resultado dos eventos', async () => {
    const { finalHighlighted } = await import('../../src/packages/code/codeTimeline');
    const spec: CodeSpec = {
      ...defaults,
      highlights: [
        { lines: '1', at: 0 },
        { lines: '3-4', at: 2, keep: true },
        { lines: '2', at: 5 },
      ],
    };
    expect(Object.keys(finalHighlighted(spec))).toEqual(['2']);
    expect(
      Object.keys(finalHighlighted({ ...spec, highlights: spec.highlights!.slice(0, 2) }))
    ).toEqual(['1', '3', '4']);
  });

  it('a duração da linha do tempo bate com o ritmo real da digitação', () => {
    const spec: CodeSpec = { ...defaults, code: 'ab\n  cd\n\nef', cps: 40, delay: 0 };
    const root = rootWith(['ab', '  cd', ' ', 'ef']);
    let last = 0;
    const api = makeApi({
      frame: (fn) => {
        for (let ts = 0; ts < 20000; ts += 10) {
          last = ts;
          if (fn(ts) === false) return;
        }
      },
    });
    void codeRuntime(root, spec, api)!.play();
    expect(Math.abs(last / 1000 - typingSeconds(spec))).toBeLessThan(0.05);
  });

  it('a linha do tempo move destaques e converte a duração em velocidade', () => {
    const spec: CodeSpec = {
      ...defaults,
      delay: 0,
      highlights: [{ lines: '1', at: 2 }],
    };
    const end = typingEnd(spec);
    const moved = codeTimeline.move(spec, 'hl-0', { start: end + 5 });
    expect(moved).toEqual({ highlights: [{ lines: '1', at: 5, keep: false }] });
    const slower = codeTimeline.move(spec, 'typing', { duration: typingSeconds(spec) * 2 });
    expect((slower as { cps: number }).cps).toBeLessThan(spec.cps);
    expect(codeTimeline.events(spec).map((e) => e.id)).toEqual(['typing', 'hl-0']);
  });
});
