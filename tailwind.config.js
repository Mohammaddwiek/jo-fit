/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          cyan: '#00E5FF',
          emerald: '#00E676',
          gold: '#F59E0B',
        },
        bank: {
          navy: '#002B49',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.45)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.5)',
        'glow-emerald': '0 0 20px rgba(0, 230, 118, 0.45)',
        'glow-red': '0 0 20px rgba(244, 63, 94, 0.55)',
      },
      animation: {
        'pulse-slow': 'pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
