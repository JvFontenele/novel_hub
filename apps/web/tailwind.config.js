const colorVar = (name) => `rgb(var(${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: colorVar('--color-ink'),
          1: colorVar('--color-ink-1'),
          2: colorVar('--color-ink-2'),
          3: colorVar('--color-ink-3'),
          4: colorVar('--color-ink-4'),
          5: colorVar('--color-ink-5'),
        },
        amber: {
          DEFAULT: colorVar('--color-accent'),
          light: colorVar('--color-accent-light'),
          dim: colorVar('--color-accent-dim'),
          muted: colorVar('--color-accent-muted'),
        },
        parchment: {
          DEFAULT: colorVar('--color-parchment'),
          dim: colorVar('--color-parchment-dim'),
          muted: colorVar('--color-parchment-muted'),
        },
      },
      fontFamily: {
        display: ['Poppins', '"Segoe UI"', 'sans-serif'],
        body: ['Inter', '"Segoe UI"', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
