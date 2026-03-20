/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0c0a07',
          1: '#13100b',
          2: '#1a1610',
          3: '#242016',
          4: '#2e2a1e',
          5: '#3d3828',
        },
        amber: {
          DEFAULT: '#c9943a',
          light: '#e8b96a',
          dim: '#8a6428',
          muted: '#5c4219',
        },
        parchment: {
          DEFAULT: '#e8dcc8',
          dim: '#a8997e',
          muted: '#6b5e47',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
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
