/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        namaha: {
          green: {
            DEFAULT: '#023835',
            dark: '#002624',
            deep: '#011c1a',
            light: '#05544e',
            mint: '#e6f4f2',
            bright: '#047857',
            cream: '#F4F8F7',
            surface: '#FFFFFF',
            soft: '#EBF5F3',
          },
          gold: {
            DEFAULT: '#E6A12A',
            light: '#F3B33E',
            dark: '#C7881E',
            pale: '#FFFDF5',
            warm: '#D97706',
            amber: '#B45309',
          },
          accent: {
            orange: '#E06D20',
            saffron: '#EA580C',
            red: '#D32F2F',
            veg: '#16A34A',
            vegDark: '#15803D',
          }
        }
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'namaha': '0 10px 30px -10px rgba(2, 56, 53, 0.15)',
        'namaha-gold': '0 10px 30px -10px rgba(230, 161, 42, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
