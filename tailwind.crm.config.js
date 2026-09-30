/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./crm/index.html', './src/shared/**/*.{js,jsx}', './src/crm/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdeff',
          300: '#8ec9ff',
          400: '#58a8ff',
          500: '#006fee',
          600: '#005bc4',
          700: '#00479b',
          800: '#023c80',
          900: '#07336b',
        },
        accent: {
          500: '#7828c8',
          600: '#6020a0',
        },
      },
    },
  },
};
