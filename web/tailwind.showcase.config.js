/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/shared/**/*.{js,jsx}', './src/showcase/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#006fee',
          50: '#e6f1fe',
          100: '#cce3fd',
          500: '#006fee',
          600: '#005bc4',
          700: '#00479b',
        },
        secondary: {
          DEFAULT: '#7828c8',
          50: '#f2eafe',
          500: '#7828c8',
        },
        success: {
          DEFAULT: '#17c964',
          50: '#e8faf0',
          500: '#17c964',
        },
        warning: {
          DEFAULT: '#f5a524',
          50: '#fef4e6',
          500: '#f5a524',
        },
        danger: {
          DEFAULT: '#f31260',
          50: '#fee7ef',
          500: '#f31260',
        },
      },
    },
  },
};
