/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Imperial Gold ramp â replaces the old pre-rebrand amber/gold scale.
           500 stays anchored almost exactly on --imperial-gold (#C8A14B). */
        brand: { 50: '#FDF8EB', 100: '#F7ECD3', 200: '#EFE0B5', 300: '#E7CE8E', 400: '#E7CE8E', 500: '#C8A14B', 600: '#A07A20', 700: '#795B1A', 800: '#654A1C', 900: '#563F1D' },
        /* Royal Sapphire ramp â replaces the old pre-rebrand blue-grey scale.
           900 is anchored exactly on --royal-sapphire (#11183A). */
        navy: { 50: '#F7F8FA', 100: '#EDEFF4', 200: '#DCE0EA', 300: '#C9CEDD', 400: '#9098B5', 500: '#6B7398', 600: '#3C4670', 700: '#232F5E', 800: '#1A234E', 900: '#11183A' },
      },
      fontFamily: {
        /* "serif" / "mono" utility names are kept so existing classNames
           (font-mono, font-serif) don't need to change anywhere â they now
           resolve to the brand's actual type system instead of Georgia /
           JetBrains Mono. */
        serif: ['var(--font-cormorant)', 'Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['var(--font-eb-garamond)', 'EB Garamond', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
