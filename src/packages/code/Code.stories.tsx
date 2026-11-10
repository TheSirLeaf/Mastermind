import type { Meta, StoryObj } from '@storybook/react';

import { H } from '../core/helper';

import { codeDefaults, codePresets } from './CodePackage';
import { CodeRenderer, type CodeSpec } from './CodeRenderer';

const meta: Meta<typeof CodeRenderer> = {
  title: 'Packages/Code',
  component: CodeRenderer,
  argTypes: {
    spec: { table: { disable: true } },
    h: { table: { disable: true } },
  },
};

export default meta;

type Story = StoryObj<typeof CodeRenderer>;

export const Default: Story = {
  args: { spec: codeDefaults, h: H },
};

export const CSharpTransacao: Story = {
  args: { spec: { ...codeDefaults, ...codePresets[0]!.spec } as CodeSpec, h: H },
};

export const YamlWorkflow: Story = {
  args: { spec: { ...codeDefaults, ...codePresets[1]!.spec } as CodeSpec, h: H },
};

export const SqlConsulta: Story = {
  args: { spec: { ...codeDefaults, ...codePresets[2]!.spec } as CodeSpec, h: H },
};
