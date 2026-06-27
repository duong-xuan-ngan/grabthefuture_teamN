/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: '#306D29',
          soft: '#EEF3EC',
          dark: '#1F4A1B',
        },
        // Neutrals (warm)
        ink: {
          DEFAULT: '#0B0B0A',
          2: '#6B6B65',
          3: '#A0A099',
        },
        hairline: '#ECECE6',
        line: '#E1E1DA',
        surface: '#FAFAF7',
        // Severity
        danger: '#B91C1C',
        'danger-soft': '#FEE2E2',
        warning: '#B45309',
        'warning-soft': '#FEF3C7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': '0.6875rem',
      },
      letterSpacing: {
        'tightish': '-0.015em',
        'tightest': '-0.025em',
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.6)', opacity: '0.35' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
