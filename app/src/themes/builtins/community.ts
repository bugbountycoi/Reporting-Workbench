import type { ThemeSpec } from '../types'

// Terminal-prompt logo — dark paths on transparent background.
// CSS filter (brightness(0) invert(1)) renders it white in the dark header.
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 40">
  <rect x="2" y="6" width="28" height="28" rx="4" fill="none" stroke="#000" stroke-width="2"/>
  <text x="7" y="26" font-family="monospace" font-weight="700" font-size="15" fill="#000">&gt;_</text>
  <text x="40" y="27" font-family="monospace" font-weight="700" font-size="17" fill="#000">Community Edition</text>
</svg>`

export const communityTheme: ThemeSpec = {
  id: 'community',
  name: 'Community Edition',
  author: 'Community',
  version: '2.0.0',
  colors: {
    // Header/nav — VulnerabilityVibes near-black
    navy:      '#0d0d0f',
    navyLight: '#141417',
    navyMid:   '#1a1a1f',
    // Primary actions — VV signature mint glow
    blue:      '#00f5c4',
    blueDark:  '#00c4a0',
    blueLight: '#4dffd9',
    // Secondary accent — VV violet
    orange:     '#7b61ff',
    orangeDark: '#6347e8',
    // Status colours
    red:    '#ff4d6d',
    green:  '#00d4a8',
    gold:   '#ffd166',
    sky:    '#b0fff0',
    // Grays — VV cool-purple undertone
    grayDark:  '#2a2a38',
    grayMid:   '#68687e',
    // Surfaces — light with subtle cool tint
    grayLight: '#d6d6e8',
    offWhite:  '#f0f0f8',
    nearWhite: '#f8f8fc',
  },
  fonts: {
    heading: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    body:    'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  },
  logoSvg,
  footerText: 'Community Edition — open source · stay curious',
}
