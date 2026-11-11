import { ChartPackage } from '@packages/chart';
import { CodePackage } from '@packages/code';
import { createDefaultDeck } from '@packages/core/deck';
import { registry } from '@packages/core/PackageRegistry';
import { useDeckStore } from '@store/deckStore';
import { beforeEach, describe, expect, it } from 'vitest';

import { insertPackage } from '../../src/editor/insertPackage';

const state = () => useDeckStore.getState();

beforeEach(() => {
  if (!registry.has('code')) registry.register(CodePackage);
  if (!registry.has('chart')) registry.register(ChartPackage);
  state().setDeck(createDefaultDeck());
  state().requestSelection(null);
});

describe('insertPackage', () => {
  it('insere a caixa de código no slide atual e pede a seleção do novo elemento', () => {
    const result = insertPackage('code');

    expect(result).not.toBeNull();
    const html = state().deck.slides[0]?.html ?? '';
    expect(html).toContain('data-pkg="code"');
    expect(html).toContain('position:absolute');
    expect(html).toContain('RunInTransactionAsync');
    expect(result?.path).toEqual([0, expect.any(Number)]);
    expect(state().pendingSelection).toEqual(result?.path);
  });

  it('aplica o preset escolhido do gráfico', () => {
    const result = insertPackage('chart', 3);

    expect(result?.label).toContain('Rosca');
    const html = state().deck.slides[0]?.html ?? '';
    expect(html).toContain('data-pkg="chart"');
    expect(html).toContain('&quot;kind&quot;:&quot;donut&quot;');
  });

  it('ignora pacote desconhecido', () => {
    expect(insertPackage('nao-existe')).toBeNull();
  });
});
