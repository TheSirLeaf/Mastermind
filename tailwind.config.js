/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './stories/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wine: {
          DEFAULT: '#4A1B2C',
          deep: '#2A0E1A',
        },
        rose: {
          DEFAULT: '#8E3B52',
          light: '#C77C8A',
        },
        blush: '#F5E8E5',
        cream: '#FFF8F5',
        gold: {
          DEFAULT: '#F7D98B',
          dark: '#D6A84F',
        },
        ink: '#3B3032',
        muted: '#B99FA0',
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
