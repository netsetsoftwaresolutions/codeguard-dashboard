/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('./tailwind-preset.cjs')],
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', './src/components/primitives/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
