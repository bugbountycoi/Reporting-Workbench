import type { ThemeSpec } from '../types'

// Simple shield SVG — dark paths on transparent background.
// CSS filter (brightness(0) invert(1)) renders it white in the dark header.
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 40">
  <path d="M20 2 L36 9 L36 22 Q36 33 20 40 Q4 33 4 22 L4 9 Z" fill="none" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M13 21 Q20 27 27 21" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round"/>
  <circle cx="15" cy="17" r="1.8" fill="#000"/>
  <circle cx="25" cy="17" r="1.8" fill="#000"/>
  <text x="46" y="27" font-family="system-ui,-apple-system,sans-serif" font-weight="600" font-size="18" fill="#000">Community Edition</text>
</svg>`

export const communityTheme: ThemeSpec = {
  id: 'community',
  name: 'Community Edition',
  author: 'Community',
  version: '1.0.0',
  colors: {
    navy:      '#0f3f45',
    navyLight: '#174f57',
    navyMid:   '#1f6470',
    blue:      '#00B4D8',
    blueDark:  '#0096B7',
    blueLight: '#38C9E0',
    orange:     '#E99C4A',
    orangeDark: '#C47E35',
    red:       '#F03157',
    green:     '#02A87C',
    gold:      '#E0AC00',
    sky:       '#B2EBF2',
    grayDark:  '#4a5568',
    grayMid:   '#718096',
    grayLight: '#E2E8F0',
    offWhite:  '#F0FDFD',
    nearWhite: '#F7FFFE',
  },
  fonts: {
    heading: 'system-ui, -apple-system, sans-serif',
    body:    'system-ui, -apple-system, sans-serif',
  },
  logoSvg,
  footerText: 'Community Edition — data stays on your device',
}
