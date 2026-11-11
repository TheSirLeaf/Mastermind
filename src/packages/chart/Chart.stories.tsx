import type { Meta, StoryObj } from '@storybook/react';

import { H } from '../core/helper';

import { chartDefaults, chartPresets } from './ChartPackage';
import { ChartRenderer, type ChartSpec } from './ChartRenderer';

const meta: Meta<typeof ChartRenderer> = {
  title: 'Packages/Chart',
  component: ChartRenderer,
  argTypes: {
    spec: { table: { disable: true } },
    h: { table: { disable: true } },
  },
};

export default meta;

type Story = StoryObj<typeof ChartRenderer>;

export const Default: Story = {
  args: { spec: chartDefaults, h: H },
};

export const BarrasVerticais: Story = {
  args: { spec: { ...chartDefaults, ...chartPresets[0]!.spec } as ChartSpec, h: H },
};

export const BarrasHorizontais: Story = {
  args: { spec: { ...chartDefaults, ...chartPresets[1]!.spec } as ChartSpec, h: H },
};

export const Linha: Story = {
  args: { spec: { ...chartDefaults, ...chartPresets[2]!.spec } as ChartSpec, h: H },
};

export const Rosca: Story = {
  args: { spec: { ...chartDefaults, ...chartPresets[3]!.spec } as ChartSpec, h: H },
};
