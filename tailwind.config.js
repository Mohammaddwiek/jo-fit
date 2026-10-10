/** Neutral colors come from CSS variables (globals.css) so they flip with the light/dark theme. */
const themed = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: themed('bg'),
        surface: themed('surface'),
        'surface-2': themed('surface-2'),
        line: themed('line'),
        ink: themed('ink'),
        soft: themed('soft'),
        muted: themed('muted'),
        // Accent TEXT: deeper shades in light mode so it stays readable on white.
        accent: {
          emerald: themed('accent-emerald'),
          cyan: themed('accent-cyan'),
          gold: themed('accent-gold'),
        },
        alert: '#EF4444',
        // Accent FILLS: identical neon in both modes.
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
        sans: ['var(--font-inter)', 'var(--font-arabic)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.45)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.5)',
        'glow-emerald': '0 0 20px rgba(0, 230, 118, 0.45)',
        'glow-red': '0 0 22px rgba(239, 68, 68, 0.55)',
      },
      animation: {
        'pulse-slow': 'pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
