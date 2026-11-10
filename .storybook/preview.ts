import type { Preview } from '@storybook/react';

import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: 'wine',
      values: [
        { name: 'wine', value: '#2A0E1A' },
        { name: 'ink', value: '#10060B' },
        { name: 'cream', value: '#FFF8F5' },
      ],
    },
  },
};

export default preview;
