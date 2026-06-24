import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          50:  '#E8EEF5',
          100: '#C5D4E6',
          200: '#9FB9D5',
          300: '#799EC4',
          400: '#5C87B6',
          500: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          600: 'rgb(var(--color-primary-dark-rgb) / <alpha-value>)',
          700: 'rgb(var(--color-primary-darker-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          50:  '#E8F6F1',
          100: '#C4E9DB',
          500: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          600: 'rgb(var(--color-accent-dark-rgb) / <alpha-value>)',
          700: 'rgb(var(--color-accent-darker-rgb) / <alpha-value>)',
        },
        danger: '#E24B4A',
        warning: '#EF9F27',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}

export default config
