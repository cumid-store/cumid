/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FCFBF9',
          100: '#FAF8F5',
          200: '#F7F4EF', // Base background
          300: '#EEE9E0',
          400: '#E4DDD0',
          500: '#D5CBB9',
        },
        charcoal: {
          50: '#F5F5F5',
          100: '#E5E4E2',
          300: '#8C8782',
          500: '#4D4844',
          700: '#33302D',
          800: '#252321', // Base text
          900: '#181716',
        },
        lavender: {
          50: '#F6F4F9',
          100: '#EBE6F2',
          200: '#D7CEE5',
          300: '#BAACD1',
          400: '#A69ABB', // Base accent
          500: '#8676A0',
          600: '#6B5B84',
          700: '#55476B',
          800: '#423753',
        },
        sage: {
          50: '#F4F6F3',
          100: '#E5EAE3',
          200: '#CAD4C7',
          300: '#B0BFA9',
          400: '#929C8A', // Base supporting
          500: '#75806D',
          600: '#5A6353',
          700: '#444C3E',
        },
        peach: {
          50: '#FBF8F5',
          100: '#F6EFEA',
          200: '#EDDCD3',
          300: '#E5CBBC',
          400: '#DFC3B2', // Base supporting
          500: '#C19982',
          600: '#9E745C',
          700: '#7C5641',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['"Newsreader"', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(37, 35, 33, 0.05)',
        'soft': '0 4px 20px -2px rgba(37, 35, 33, 0.08)',
        'soft-lg': '0 12px 32px -4px rgba(37, 35, 33, 0.12)',
        'soft-xl': '0 20px 48px -8px rgba(37, 35, 33, 0.16)',
      },
      borderRadius: {
        'spiral': '18px',
      },
    },
  },
  plugins: [],
};
