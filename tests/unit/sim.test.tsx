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
import { normalizeSteps, simDefaults } from '../../src/packages/sim/SimSpec';

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
