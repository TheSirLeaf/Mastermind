import { createElement } from 'react';

import type { HelperAPI, PackageDef, Preset } from '../core/types';

import { chartCss } from './chart.css';
import { ChartRenderer, type ChartSpec } from './ChartRenderer';
import { chartRuntime } from './ChartRuntime';
import { chartForm } from './formSchema';

export type { ChartSpec };

export const chartDefaults: ChartSpec = {
  kind: 'bar',
  title: '',
  rows: [
    { label: '11/10', val: '5', hl: false },
    { label: '12/10', val: '8', hl: false },
    { label: '14/10', val: '11', hl: false },
    { label: '20/10', val: '11', hl: false },
    { label: '24/10', val: '40', hl: true },
    { label: '30/10', val: '9', hl: false },
  ],
  color: '#C77C8A',
  hlColor: '#F7D98B',
  max: '',
  suffix: '',
  decimals: 0,
  showValues: true,
  grid: false,
  animate: true,
  countUp: true,
  delay: 0.3,
  w: 900,
  colorMode: 'single',
  animStyle: 'grow',
  animDuration: 0.8,
  stagger: 0.08,
  animEase: 'cubic-bezier(.2,.8,.2,1)',
};

export const chartPresets: Preset<ChartSpec>[] = [
  {
    name: 'Barras verticais',
    desc: 'Como o gráfico de commits do slide 19',
    spec: { kind: 'bar' },
  },
  {
    name: 'Barras horizontais',
    desc: 'Como as barras de cobertura',
    spec: {
      kind: 'hbar',
      suffix: '%',
      decimals: 1,
      rows: [
        { label: 'Linhas', val: '90,0', hl: true },
        { label: 'Branches', val: '91,2', hl: false },
        { label: 'FuncoesGerais', val: '98,8', hl: false },
      ],
    },
  },
  {
    name: 'Linha',
    desc: 'Evolução ao longo do tempo',
    spec: {
      kind: 'line',
      rows: [
        { label: 'S1', val: '12' },
        { label: 'S2', val: '30' },
        { label: 'S3', val: '24' },
        { label: 'S4', val: '48', hl: true },
      ],
    },
  },
  {
    name: 'Rosca',
    desc: 'Proporção entre categorias',
    spec: {
      kind: 'donut',
      colorMode: 'palette',
      w: 760,
      rows: [
        { label: 'Aprovados', val: '137', hl: true },
        { label: 'Ignorados', val: '0' },
        { label: 'Falhas', val: '3' },
      ],
    },
  },
];

export const ChartPackage: PackageDef<ChartSpec> = {
  id: 'chart',
  name: 'Gráfico',
  version: '1.0.0',
  icon: 'chart',
  author: 'Dialcron',
  description:
    'Barras verticais, barras horizontais, linha e rosca, com entrada animada e contagem dos valores.',
  defaults: chartDefaults,
  presets: chartPresets,
  box: { w: 900 },
  form: chartForm,
  css: chartCss,
  render: (spec, h: HelperAPI) => createElement(ChartRenderer, { spec, h }),
  duration: (spec) =>
    spec.animate
      ? spec.delay * 1000 +
        (spec.animDuration ?? 0.8) * 1000 +
        (spec.stagger ?? 0.08) * 1000 * Math.max(0, (spec.rows?.length ?? 1) - 1)
      : 0,
  // Referência direta (não wrapper): o runtime é serializado via String() no
  // export e precisa reviver autossuficiente no host do HTML standalone.
  runtime: chartRuntime,
};
