/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#fdf8eb', 100: '#f9eccc', 200: '#f3d694', 300: '#edc05c', 400: '#e8ad35', 500: '#c9a84c', 600: '#a07a20', 700: '#795b1a', 800: '#654a1c', 900: '#563f1d' },
        navy: { 50: '#f0f4f8', 100: '#d9e2ec', 200: '#bcccdc', 300: '#9fb3c8', 400: '#7a8fa8', 500: '#627d98', 600: '#486581', 700: '#334e68', 800: '#243850', 900: '#0d1b2a' },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
