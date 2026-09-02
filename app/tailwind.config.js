/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:           'var(--brand-navy)',
          'navy-light':   'var(--brand-navy-light)',
          'navy-mid':     'var(--brand-navy-mid)',
          blue:           'var(--brand-blue)',
          'blue-dark':    'var(--brand-blue-dark)',
          'blue-light':   'var(--brand-blue-light)',
          orange:         'var(--brand-orange)',
          'orange-dark':  'var(--brand-orange-dark)',
          red:            'var(--brand-red)',
          green:          'var(--brand-green)',
          gold:           'var(--brand-gold)',
          sky:            'var(--brand-sky)',
          'gray-dark':    'var(--brand-gray-dark)',
          'gray-mid':     'var(--brand-gray-mid)',
          'gray-light':   'var(--brand-gray-light)',
          'off-white':    'var(--brand-off-white)',
          'near-white':   'var(--brand-near-white)',
        },
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body:    'var(--font-body)',
      },
    },
  },
  plugins: [],
}
