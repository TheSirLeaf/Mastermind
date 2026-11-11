/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './stories/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        payday: {
          bg: '#0a0a0a',
          surface: '#141414',
          panel: '#1e1e1e',
          border: '#2a2a2a',
          text: '#ffffff',
          textMuted: '#b0b0b0',
          textDim: '#808080',
        },
        gold: {
          DEFAULT: '#F7D98B',
          dark: '#D6A84F',
        },
        success: '#72A68A',
        danger: '#C95C62',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 24px 60px -24px rgba(16, 6, 11, 0.55)',
      },
    },
  },
  plugins: [],
};
