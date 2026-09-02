import type { ThemeSpec } from '../types'
import logoSvg from '../../../public/intigriti-logo.svg?raw'

export const intigritiTheme: ThemeSpec = {
  id: 'intigriti',
  name: 'Intigriti',
  author: 'Intigriti',
  version: '1.0.0',
  colors: {
    navy:      '#161A36',
    navyLight: '#1F2447',
    navyMid:   '#2A3060',
    blue:      '#4C59A8',
    blueDark:  '#3A4585',
    blueLight: '#6170B8',
    orange:     '#E99C4A',
    orangeDark: '#C47E35',
    red:       '#F03157',
    green:     '#02A87C',
    gold:      '#E0AC00',
    sky:       '#7BCFDB',
    grayDark:  '#575865',
    grayMid:   '#717171',
    grayLight: '#E8E8E8',
    offWhite:  '#F6F6FB',
    nearWhite: '#F9F9FB',
  },
  fonts: {
    heading: "'Montserrat', system-ui, sans-serif",
    body:    "'Open Sans', system-ui, sans-serif",
  },
  logoSvg,
  footerText: 'data stays on your device & goes only to the Intigriti API',
}
