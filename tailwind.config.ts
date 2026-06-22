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
          DEFAULT: '#1E3A5F',
          50: '#E8EEF5',
          100: '#C5D4E6',
          200: '#9FB9D5',
          300: '#799EC4',
          400: '#5C87B6',
          500: '#1E3A5F',
          600: '#1A3357',
          700: '#152A4A',
          800: '#10213D',
          900: '#081730',
        },
        accent: {
          DEFAULT: '#1D9E75',
          50: '#E8F6F1',
          100: '#C4E9DB',
          200: '#9DDAC3',
          300: '#76CBAB',
          400: '#55BF98',
          500: '#1D9E75',
          600: '#189169',
          700: '#12825B',
          800: '#0C734E',
          900: '#065A3A',
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
