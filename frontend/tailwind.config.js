/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — Grab design system
        primary: {
          DEFAULT: '#00B14F',
          dark: '#00873A',
          soft: '#E6F7EE',
        },
        brand: {
          teal: '#00212F',
          'teal-text': '#B0C4CC',
        },
        ink: {
          DEFAULT: '#333333',
          2: '#767676',
          3: '#A3A3A3',
        },
        hairline: '#E8E8E8',
        line: '#DCDCDC',
        surface: '#F5F5F5',
        // Severity
        danger: '#DC2626',
        'danger-soft': '#FEE2E2',
        warning: '#D97706',
        'warning-soft': '#FEF3C7',
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': '0.6875rem',
      },
      letterSpacing: {
        'tightish': '-0.015em',
        'tightest': '-0.025em',
      },
      borderRadius: {
        'btn': '8px',
        'card': '12px',
        'modal': '16px',
        'pill': '999px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.08)',
        'dropdown': '0 8px 24px rgba(0,0,0,0.14)',
        'header': '0 2px 12px rgba(0,0,0,0.10)',
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
