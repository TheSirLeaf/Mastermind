/** Cor a partir de variável com canais RGB, mantendo os modificadores de opacidade (`/50`). */
const withAlpha = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './stories/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Todas as cores vêm de variáveis CSS (ver src/index.css): trocar o tema é trocar
      // o conjunto de variáveis em :root / [data-theme], sem tocar nos componentes.
      colors: {
        payday: {
          bg: withAlpha('--c-bg'),
          surface: withAlpha('--c-surface'),
          panel: withAlpha('--c-panel'),
          border: withAlpha('--c-border'),
          text: withAlpha('--c-text'),
          textMuted: withAlpha('--c-text-muted'),
          textDim: withAlpha('--c-text-dim'),
        },
        // Cor de destaque e o texto que fica SOBRE ela (sempre com contraste garantido).
        accent: {
          DEFAULT: withAlpha('--c-accent'),
          dark: withAlpha('--c-accent-dark'),
          fg: withAlpha('--c-on-accent'),
        },
        cream: withAlpha('--c-text'),
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
