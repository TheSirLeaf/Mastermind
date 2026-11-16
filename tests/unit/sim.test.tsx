import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { registerBuiltins } from '../../src/packages';
import { H } from '../../src/packages/core/helper';
import { PackageRegistry } from '../../src/packages/core/PackageRegistry';
import { compileFunction, serializePackage } from '../../src/packages/core/serialization';
import type { RuntimeAPI } from '../../src/packages/core/types';
import { SimPackage } from '../../src/packages/sim/SimPackage';
import { SimRenderer } from '../../src/packages/sim/SimRenderer';
import { simRuntime } from '../../src/packages/sim/simRuntime';
import { normalizeSteps, simBlank, simDefaults } from '../../src/packages/sim/SimSpec';

function mount(spec = simDefaults): HTMLElement {
  document.body.innerHTML = renderToStaticMarkup(<SimRenderer spec={spec} h={H} />);
  const root = document.querySelector<HTMLElement>('.pk-sim');
  if (!root) throw new Error('root não renderizado');
  return root;
}

function instantApi(): RuntimeAPI {
  return {
    reduced: false,
    alive: () => true,
    wait: () => Promise.resolve(),
    frame: () => undefined,
  };
}

describe('pacote sim', () => {
  it('renderiza a tela, a tabela e a transação', () => {
    const root = mount();
    expect(root.textContent).toContain('Dialcron');
    expect(root.textContent).toContain('Marina Souza');
    expect(root.textContent).toContain('bel_atendimento_servico');
    expect(root.querySelectorAll('[data-sim-row]')).toHaveLength(3);
    expect(root.querySelector('[data-sim-btn="Salvar"]')).not.toBeNull();
  });

  it('executa o roteiro, faz rollback e restaura o HTML final', async () => {
    const root = mount();
    const original = root.innerHTML;
    const controller = simRuntime(root, simDefaults, instantApi());
    expect(controller).not.toBeNull();

    await controller?.play();

    expect(root.querySelector('[data-sim-row="2"]')?.classList.contains('is-hidden')).toBe(true);
    expect(root.querySelector('[data-sim-state]')?.textContent).toBe('ROLLBACK ↩');
    expect(root.querySelectorAll('.pk-sim-chip.is-fail')).toHaveLength(1);
    expect(root.querySelectorAll('.pk-sim-chip.is-undo')).toHaveLength(2);
    expect(root.querySelector('[data-sim-msg="error"]')?.classList.contains('is-show')).toBe(true);
    expect(root.querySelector('[data-sim-valid]')?.classList.contains('is-on')).toBe(true);
    expect(root.classList.contains('is-rollback')).toBe(true);

    controller?.final();
    expect(root.innerHTML).toBe(original);
  });

  it('não anima com prefers-reduced-motion e mantém o estado final', async () => {
    const root = mount();
    const original = root.innerHTML;
    const controller = simRuntime(root, simDefaults, { ...instantApi(), reduced: true });
    await controller?.play();
    expect(root.innerHTML).toBe(original);
  });

  it('normaliza passos textuais e registra o pacote', () => {
    expect(normalizeSteps('[{"wait":10}]')).toEqual([{ wait: 10 }]);
    expect(normalizeSteps('{')).toEqual([]);

    const registry = new PackageRegistry();
    registerBuiltins(registry);
    expect(registry.has('sim')).toBe(true);
    expect(registry.toHTML('sim', simDefaults)).toContain('pk-sim-app');
  });

  it('renderiza toast do Windows e cursor configurado', () => {
    const root = mount({
      ...simDefaults,
      codeEnabled: false,
      cursorVisible: true,
      cursorX: 12,
      cursorY: 34,
      cursorSize: 30,
      toasts: [
        {
          id: 'backup',
          app: 'Backup do Windows',
          title: 'Backup concluído',
          body: 'Arquivos salvos.',
          tone: 'success',
          visible: true,
        },
      ],
    });
    expect(root.querySelector('[data-sim-toast="backup"]')?.classList.contains('is-show')).toBe(
      true
    );
    const cursor = root.querySelector<HTMLElement>('[data-sim-cursor]');
    expect(cursor).not.toBeNull();
    expect(cursor?.style.left).toBe('12%');
    expect(cursor?.style.top).toBe('34%');
    expect(cursor?.style.width).toBe('30px');
  });

  it('executa cursor e toast pelo roteiro', async () => {
    const spec = {
      ...simDefaults,
      codeEnabled: false,
      cursorVisible: true,
      cursorX: 10,
      cursorY: 10,
      toasts: [
        {
          id: 'backup',
          app: 'Backup do Windows',
          title: 'Backup concluído',
          body: 'Arquivos salvos.',
          tone: 'success' as const,
          visible: false,
        },
      ],
      steps: JSON.stringify([
        { wait: 10, toast: { id: 'backup', action: 'show' } },
        {
          wait: 10,
          cursor: { x: 72, y: 28, duration: 0, ease: 'linear', click: true },
        },
        { wait: 10, toast: { id: 'backup', action: 'click' } },
      ]),
    };
    const root = mount(spec);
    const controller = simRuntime(root, spec, instantApi());
    await controller?.play();

    const toast = root.querySelector('[data-sim-toast="backup"]');
    expect(toast?.classList.contains('is-show')).toBe(true);
    expect(toast?.classList.contains('is-click')).toBe(true);
    const cursor = root.querySelector<HTMLElement>('[data-sim-cursor]');
    expect(cursor?.style.left).toBe('72%');
    expect(cursor?.style.top).toBe('28%');
    await new Promise((resolve) => window.setTimeout(resolve, 5));
    expect(root.querySelector('.pk-sim-click')).not.toBeNull();

    controller?.final();
  });

  it('monta a tela só com as partes preenchidas (qualquer aplicativo)', () => {
    const root = mount({
      ...simDefaults,
      ...simBlank,
      appName: 'Pipeline',
      tagText: '',
      sideShow: false,
      heading: '',
      date: '',
      columns: '',
      rows: [],
      fields: [],
      buttons: [],
      msgSuccess: '',
      msgError: '',
      msgConfirm: '',
      txChips: [],
      txNote: '',
      codeEnabled: false,
      listTitle: 'build',
      listAction: 'push',
      items: [{ label: 'Restore' }, { label: 'Test' }],
      sumValue: '2',
      sumLabel: 'passos',
      steps: '[]',
    });
    expect(root.textContent).toContain('Pipeline');
    expect(root.querySelector('.pk-sim-side')).toBeNull();
    expect(root.querySelector('.pk-sim-simtag')).toBeNull();
    expect(root.querySelector('.pk-sim-table')).toBeNull();
    expect(root.querySelector('.pk-sim-fields')).toBeNull();
    expect(root.querySelector('.pk-sim-tx')).toBeNull();
    expect(root.querySelector('.pk-sim-code-win')).toBeNull();
    expect(root.querySelectorAll('[data-sim-msg]')).toHaveLength(0);
    expect(root.querySelectorAll('[data-sim-item]')).toHaveLength(2);
    expect(root.querySelector('[data-sim-btn="push"]')).not.toBeNull();
    // nada do exemplo antigo vaza para uma tela nova
    expect(root.textContent).not.toMatch(/Atendimento|formulário válido|COMMIT/);
  });

  it('mantém os textos antigos em specs salvos antes dos campos novos', () => {
    const old = { ...simDefaults } as Record<string, unknown>;
    for (const key of ['tagText', 'tableTitle', 'formTitle', 'validText', 'txState', 'codeNote']) {
      delete old[key];
    }
    const root = mount(old as typeof simDefaults);
    expect(root.textContent).toContain('Atendimentos do dia');
    expect(root.textContent).toContain('✓ formulário válido');
    expect(root.querySelector('[data-sim-state]')?.textContent).toBe('COMMIT ✓');
  });

  it('roda lista de tarefas, contagem, diálogo próprio e célula do painel', async () => {
    const spec = {
      ...simDefaults,
      codeEnabled: false,
      listTitle: 'Testes',
      listAction: 'Executar',
      items: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
      sumValue: '137',
      dialogs: [
        { id: 'salvar', kind: 'file' as const, rows: 'Nome: x.db', buttons: 'Salvar; Cancelar' },
      ],
      dbColumns: 'id; situacao',
      dbRows: [{ cells: '3; E', start: '3; a', highlight: true }],
      txStateStart: 'aguardando',
      steps: [
        { state: 'rodando', stateTone: 'begin' as const },
        { item: { index: 1, status: 'mark' as const } },
        { dialog: 'salvar' },
        { press: 'Salvar' },
        { cell: { row: 0, col: 1, text: 'E', tone: 'danger' as const } },
        { runItems: 10 },
        { count: 32 },
      ],
    };
    const root = mount(spec);
    const original = root.innerHTML;
    let seenStart = '';
    let seenCell = '';
    let seenSum = '';
    let seenIdle = 0;
    const api = instantApi();
    let first = true;
    api.wait = () => {
      if (first) {
        first = false;
        seenStart = root.querySelector('[data-sim-state]')?.textContent ?? '';
        seenCell = root.querySelector('[data-sim-dbrow="0"]')?.children[1]?.textContent ?? '';
        seenSum = root.querySelector('[data-sim-sum]')?.textContent ?? '';
        seenIdle = root.querySelectorAll('[data-sim-item].is-idle').length;
      }
      return Promise.resolve();
    };
    const controller = simRuntime(root, { ...spec, steps: [{ wait: 1 }, ...spec.steps] }, api);
    await controller?.play();

    // começo da animação: tudo o que o roteiro mexe volta ao estado inicial
    expect(seenStart).toBe('aguardando');
    expect(seenCell).toBe('a');
    expect(seenSum).toBe('0');
    expect(seenIdle).toBe(3);
    // fim
    expect(root.querySelector('[data-sim-state]')?.textContent).toBe('rodando');
    expect(root.querySelectorAll('[data-sim-item].is-ok')).toHaveLength(3);
    expect(root.querySelector('[data-sim-item="1"]')?.classList.contains('is-mark')).toBe(true);
    expect(root.querySelector('[data-sim-sum]')?.textContent).toBe('137');
    expect(root.querySelector('[data-sim-msg="salvar"]')?.classList.contains('is-show')).toBe(true);
    const cell = root.querySelector('[data-sim-dbrow="0"]')?.children[1];
    expect(cell?.textContent).toBe('E');
    expect(cell?.className).toBe('is-danger');

    controller?.final();
    expect(root.innerHTML).toBe(original);
  });

  it('digita várias janelas de código com a contagem de linhas contínua', async () => {
    const spec = {
      ...simDefaults,
      codeCode: 'a();\nb();',
      codes: [{ file: 'dois.cs', tag: 'C#', lang: 'csharp', code: 'c();' }],
      steps: [{ at: 2, state: 'terceira', stateTone: 'ok' as const }],
    };
    const root = mount(spec);
    expect(root.querySelectorAll('.pk-sim-code-win')).toHaveLength(2);
    expect(
      Array.from(root.querySelectorAll('.pk-sim-ln')).map((l) => l.getAttribute('data-line'))
    ).toEqual(['0', '1', '2']);
    const controller = simRuntime(root, spec, instantApi());
    await controller?.play();
    expect(root.querySelector('[data-sim-state]')?.textContent).toBe('terceira');
    controller?.final();
  });

  it('digita o código revelando caractere a caractere, com cursor e sem perder o realce', async () => {
    const spec = {
      ...simDefaults,
      codeEnabled: true,
      codeCode: 'var a = 1;\nb();',
      codeTyping: true,
      steps: [],
    };
    const root = mount(spec);
    const original = root.innerHTML;
    const controller = simRuntime(root, spec, instantApi());
    await controller?.play();
    // Tudo revelado (nenhum caractere ficou escondido) e o texto continua íntegro.
    expect(root.querySelectorAll('.pk-sim-h')).toHaveLength(0);
    expect(root.querySelector('.pk-sim-ln')?.textContent).toBe('var a = 1;');
    expect(root.querySelectorAll('.pk-sim-caret')).toHaveLength(1);
    expect(root.querySelector('.pk-sim-tk-kw')).not.toBeNull();
    controller?.final();
    expect(root.innerHTML).toBe(original);
  });

  it('serializa o runtime autossuficiente para o HTML exportado', async () => {
    const serialized = serializePackage(SimPackage);
    expect(serialized.runtime).toEqual({ $fn: String(simRuntime) });
    const revived = compileFunction(
      (serialized.runtime as { $fn: string }).$fn
    ) as typeof simRuntime;
    const root = mount();
    const controller = revived(root, simDefaults, instantApi());
    await controller?.play();
    expect(root.querySelector('[data-sim-state]')?.textContent).toBe('ROLLBACK ↩');
    controller?.final();
  });
});
