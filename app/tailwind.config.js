/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#161A36',
          'navy-light': '#1F2447',
          'navy-mid': '#2A3060',
          blue: '#4C59A8',
          'blue-dark': '#3A4585',
          'blue-light': '#6170B8',
          orange: '#E99C4A',
          'orange-dark': '#C47E35',
          red: '#F03157',
          green: '#02A87C',
          gold: '#E0AC00',
          sky: '#7BCFDB',
          'gray-dark': '#575865',
          'gray-mid': '#717171',
          'gray-light': '#E8E8E8',
          'off-white': '#F6F6FB',
          'near-white': '#F9F9FB',
        },
      },
      fontFamily: {
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
        body: ['Open Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
