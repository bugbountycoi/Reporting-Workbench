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
    // Header/nav — deep ocean teal, clearly distinct from Intigriti's dark navy blue
    navy:      '#0A3040',
    navyLight: '#0D3D50',
    navyMid:   '#124E65',
    // Primary actions — bright cyan vs Intigriti's indigo
    blue:      '#06B6D4',
    blueDark:  '#0891B2',
    blueLight: '#22D3EE',
    // Accent — amber vs Intigriti's warm orange
    orange:     '#F59E0B',
    orangeDark: '#D97706',
    // Status colours
    red:    '#F03157',
    green:  '#02A87C',
    gold:   '#E0AC00',
    sky:    '#BAE6FD',
    // Grays — teal-shifted vs Intigriti's neutral grays
    grayDark:  '#1E3A47',
    grayMid:   '#4B7A8E',
    // Surfaces — all carry visible teal tint; clearly distinct from Intigriti's neutral whites
    grayLight: '#C2E8EF',
    offWhite:  '#E8F8FB',
    nearWhite: '#F0FBFC',
  },
  fonts: {
    heading: 'system-ui, -apple-system, sans-serif',
    body:    'system-ui, -apple-system, sans-serif',
  },
  logoSvg,
  footerText: 'Community Edition — data stays on your device',
}
